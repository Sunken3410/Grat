from django.shortcuts import render, HttpResponseRedirect, reverse,redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm,UserCreationForm
from django.db import IntegrityError
from django.conf import settings
from .service.generate_plan import generate_plan
from django.core.exceptions import ValidationError
import json
import time
from .models import User,UserGoal, ExerciseLibrary,WorkoutDay,WorkoutPlan,WorkoutSession,PlannedExercise,SetProgress,PlannedCardio,CardioProgress
from .serializer import (
    PlannedExerciseSerializer
    ,PlannedCardioSerializer,
    ExerciseLibrarySerializer,
    WorkoutDaySerializer,
    WorkoutPlanSerializer,
    WorkoutSessionSerializer,
    SetProgressSerializer,
    CardioProgressSerializer,
)

from rest_framework.response import Response
from rest_framework.decorators import api_view,permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
# Create your views here.

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_exercises(request):
    group = request.query_params.get("group")

    queryset = ExerciseLibrary.objects.filter(is_active=True)

    if group:
        queryset = queryset.filter(muscle_group__iexact=group)

    serializer = ExerciseLibrarySerializer(queryset, many=True)
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_set(request):
    serializer= SetProgressSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_cardio(request):
    serializer= CardioProgressSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    if WorkoutSession.objects.filter(user=request.user,is_completed=False).exists():
        return Response({"message":"You cannot start this session because you have an incomplete session"},status=status.HTTP_400_BAD_REQUEST)
    serializer= WorkoutSessionSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save(user=request.user, is_completed=False)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])#this does: it checks if the user is authenticated
def end_session(request):
    session=get_object_or_404(WorkoutSession,id=request.data["id"],user=request.user)
    if session.is_completed:
        return Response({"message":"You cannot end this session because it is already completed"},status=status.HTTP_400_BAD_REQUEST)
    session.is_completed=True
    session.save()
    return Response({"message":"Session ended successfully"},status=status.HTTP_200_OK)
    

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_exercise(request,id):
    exercise=get_object_or_404(PlannedExercise,id=id)
    if exercise.workout_day.workout_plan.user!=request.user:
        return Response({"message":"You are not authorized to delete this exercise"},status=status.HTTP_403_FORBIDDEN)
    exercise.delete()
    return Response({"message":"Exercise deleted successfully"},status=status.HTTP_204_NO_CONTENT)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_cardio(request,id):
    cardio=get_object_or_404(PlannedCardio,id=id)
    if cardio.workout_day.workout_plan.user!=request.user:
        return Response({"message":"You are not authorized to delete this cardio"},status=status.HTTP_403_FORBIDDEN)
    cardio.delete()
    return Response({"message":"Cardio deleted successfully"},status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_exercise(request):
    serializer = PlannedExerciseSerializer(data=request.data,context={"request":request})
    if serializer.is_valid():
        exercise=serializer.save()
        exercise.save()
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)
        
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_cardio(request):
    serializer = PlannedCardioSerializer(data=request.data,context={"request":request})
    if serializer.is_valid():
        cardio=serializer.save()
        cardio.save()
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

def index(request):
    if  not request.user.is_authenticated:
        return HttpResponseRedirect(reverse('main:register'))
    x = UserGoal.objects.filter(user=request.user).exists()
    plan=WorkoutPlan.objects.filter(user=request.user,is_active=True).first()#.first() does: return the first object in the queryset, if no object is found, it returns None
    if plan:
        days=plan.workoutday_set.all()#this does: return all the workout days for the current user as a set of objects
        all_exercises=PlannedExercise.objects.filter(workout_day__in=days)#this does: return all the exercises for the current user as a set of objects
        all_cardios=PlannedCardio.objects.filter(workout_day__in=days)#this does: return all the cardio exercises for the current user as a set of objects
        return render(request,'main/index.html',{
            "user":request.user,
            "alreadyEnteredInfo":x,
            "days":days,
            "all_exercises":all_exercises,
            "all_cardios":all_cardios
        })
    return render(request,'main/index.html',{
        "user":request.user,
        "alreadyEnteredInfo":x
    })
@login_required
def submit_goal(request):
    if request.method=="POST":
        goal=request.POST["goal"]
        days_wanna_play=int( request.POST["days_wanna_play"])
        description=request.POST["description"]
        try:
            user_goal = UserGoal.objects.create(goal=goal, days_wanna_play=days_wanna_play, description=description, user=request.user)
            WorkoutPlan.objects.filter(user=request.user,is_active=True).update(is_active=False)
            #user_goal.save()
            plan = generate_plan(user_goal)
            return redirect('main:index')
        except ValidationError as e:
            return render(request,"main/index.html",{
                "user":request.user,
                "alreadyEnteredInfo":False,
                "message":e.message
            })
    else:
        return render(request,"main/index.html",{
            "user":request.user,
            "alreadyEnteredInfo":False,
            "message":"Please fill all the fields"
        })
            
        
        

def login_view(request):
    if request.method=="POST":
        username=request.POST['username']
        password=request.POST['password']
        if not password or not username:
            return render(request,"main/login.html",{
                "message":"Please fill all the fields"
            })
        if username[0].isdigit():
            return render(request,"main/login.html",{
                "message":"Username cannot start with a number"
            })
        user=authenticate(request,username=username,password=password)
        if user is not None:
            login(request,user)
            return HttpResponseRedirect(reverse('main:index'))
        else:
            return render(request,"main/login.html",{
                'message':'Invalid username or password'
            })
    else:
        return render(request,'main/login.html')

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse('main:index'))

def register(request):
    if request.method=="POST":
        username=request.POST["username"]
        email=request.POST["email"]
        password=request.POST["password"]
        if not username or not email or not password:
            return render(request,"main/register.html",{
                "message":"Please fill all the fields"
            })
        if username[0].isdigit():
            return render(request,"main/register.html",{
                "message":"Username cannot start with a number"
            })
        try:
            user=User.objects.create_user(username,email,password)
            user.save()
        except IntegrityError:
            return render(request,"main/register.html",{
                "message":"UserName already taken"
            })
        login(request,user)
        return HttpResponseRedirect(reverse("main:index"))
    else:
        return render(request,'main/register.html')
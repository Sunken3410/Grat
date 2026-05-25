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
from django.db.models import Q
import logging
# Create your views here.

# GLOBAL VARIABLE
logger = logging.getLogger(__name__)

def _get_previous_session_for_exercise(user, current_session, exercise_library_id):
    logger.debug(f"The view : _get_previous_session_for_exercise by {user}")
    session_filters = Q(user=user)

    if current_session:
        session_filters &= ~Q(id=current_session.id)
        session_filters &= Q(date__lt=current_session.date) | Q(
            date=current_session.date,
            id__lt=current_session.id,
        )
    logger.info(f"Request allowed - To get previous session for exercise")
    return (
        WorkoutSession.objects.filter(session_filters)
        .filter(setprogress__exercise__exercise_id=exercise_library_id)
        .distinct()
        .order_by("-date", "-id")
        .first()
    )


def _get_previous_session_for_cardio(user, current_session, exercise_library_id):
    logger.debug(f"The view _get_previous_session_for_cardio called by {user}")
    session_filters = Q(user=user)

    if current_session:
        session_filters &= ~Q(id=current_session.id)
        session_filters &= Q(date__lt=current_session.date) | Q(
            date=current_session.date,
            id__lt=current_session.id,
        )
    logger.info(f"Request allowed - To get previous session for cardio")
    return (
        WorkoutSession.objects.filter(session_filters)
        .filter(cardioprogress__exercise__exercise_id=exercise_library_id)
        .distinct()
        .order_by("-date", "-id")
        .first()
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def last_tracked_cardio(request, planned_cardio_id,limit=1):
    logger.debug(f"The view last_tracked_cardio is called by {request.user}")
    planned_cardio=get_object_or_404(PlannedCardio,id=planned_cardio_id)
    if planned_cardio.workout_day.workout_plan.user!=request.user:
        logger.warning(f"Request Denied - {request.user} is Unauthorized to get tracked {planned_cardio.exercise.name_of_exercise} from {planned_cardio.workout_day.workout_plan.user}")
        return Response({"data":None,"message":"You are not authorized to view this data"},status=status.HTTP_403_FORBIDDEN)

    current_session = WorkoutSession.objects.filter(
        user=request.user,
        workout_day=planned_cardio.workout_day,
        is_completed=False,
    ).order_by("-date", "-id").first()

    previous_session = _get_previous_session_for_cardio(
        request.user,
        current_session,
        planned_cardio.exercise_id,
    )
    if not previous_session:
        logger.info(f"Request accepted - empty sessions for : {request.user} for planned cardio with id : {planned_cardio_id}")
        return Response({"data":[],"message":"No previous cardio session found"},status=status.HTTP_200_OK)

    last_cardio=CardioProgress.objects.filter(
        workout_session=previous_session,
        exercise__exercise_id=planned_cardio.exercise_id,
    ).order_by("-id")[:limit]
    serializer=CardioProgressSerializer(last_cardio,many=True,context={"request":request})
    logger.info(f"Request accepted - get last tracked cardio is done for {request.user}")
    return Response({"data":serializer.data,"message":"Data fetched successfully"},status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def last_tracked_sets(request, planned_exercise_id,limit=3):
    logger.debug(f"The view last_tracked_sets called by {request.user}")
    planned_exercise=get_object_or_404(PlannedExercise,id=planned_exercise_id)
    if planned_exercise.workout_day.workout_plan.user!=request.user:
        logger.warning(f"Request Denied - {request.user} is Unauthorized to get tracked {planned_exercise.exercise.name_of_exercise} from {planned_exercise.workout_day.workout_plan.user}")
        return Response({"data":None,"message":"You are not authorized to view this data"},status=status.HTTP_403_FORBIDDEN)

    current_session = WorkoutSession.objects.filter(
        user=request.user,
        workout_day=planned_exercise.workout_day,
        is_completed=False,
    ).order_by("-date", "-id").first()

    previous_session = _get_previous_session_for_exercise(
        request.user,
        current_session,
        planned_exercise.exercise_id,
    )
    if not previous_session:
        logger.info(f"Request accepted - empty sessions for : {request.user} for planned exercise with id : {planned_exercise_id}")
        return Response({"data":[],"message":"No previous session found"},status=status.HTTP_200_OK)

    last_sets=SetProgress.objects.filter(
        workout_session=previous_session,
        exercise__exercise_id=planned_exercise.exercise_id,
    ).order_by("set_number","id")[:limit]
    serializer=SetProgressSerializer(last_sets,many=True,context={"request":request})
    logger.info(f"Request accepted - get last tracked sets is done for {request.user}")
    return Response({"data":serializer.data,"message":"Data fetched successfully"},status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_exercises(request):
    logger.debug(f"The get_all_exercises called by {request.user}")
    group = request.query_params.get("group")

    queryset = ExerciseLibrary.objects.filter(is_active=True)

    if group:
        queryset = queryset.filter(muscle_group__iexact=group)

    serializer = ExerciseLibrarySerializer(queryset, many=True)
    logger.info(f"Request accepted - to get all exercise by {request.user}")
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_set(request):
    logger.debug(f"The view track_set is called by {request.user}")
    serializer= SetProgressSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Request accepted - to track sets by {request.user}")
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    else:
        logger.warning(f"Request Denied - unValid serializer information for tracking sets | name {request.user}")
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_cardio(request):
    logger.debug(f"The view track_cardio is called by {request.user}")
    serializer= CardioProgressSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Request accepted - to track cardio by {request.user}")
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    else:
        logger.warning(f"Request Denied - unValid serializer information for tracking cardio | name {request.user}")
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    logger.debug(f"The view start_session is called by {request.user}")
    if WorkoutSession.objects.filter(user=request.user,is_completed=False).exists():
        logger.warning(f"Request Denied - {request.user} tried to start multiple sessions at the same time")
        return Response({"message":"You cannot start this session because you have an incomplete session"},status=status.HTTP_400_BAD_REQUEST)
    serializer= WorkoutSessionSerializer(data=request.data, context={"request":request})
    if serializer.is_valid():
        serializer.save(user=request.user, is_completed=False)
        logger.info(f"Request accepted - to start Session by {request.user}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        logger.warning(f"Request Denied - unValid serializer information for starting sessions | name {request.user}")
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])#this does: it checks if the user is authenticated
def end_session(request):
    logger.debug(f"The view end_session is called by {request.user}")
    session=get_object_or_404(WorkoutSession,id=request.data["id"],user=request.user)
    if session.is_completed:
        logger.warning(f"Request Denied - {request.user} tried to end a session that is already ended")
        return Response({"message":"You cannot end this session because it is already completed"},status=status.HTTP_400_BAD_REQUEST)
    session.is_completed=True
    session.save()
    logger.info(f"Request Accepted - {request.user} just ended a session with id: {session.id} ")
    return Response({"message":"Session ended successfully"},status=status.HTTP_200_OK)
    

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_exercise(request,id):
    logger.debug(f"The view delete_exercise is called by {request.user}")
    exercise=get_object_or_404(PlannedExercise,id=id)
    if exercise.workout_day.workout_plan.user!=request.user:
        logger.warning(f"Request Denied - the user : {request.user} tried to delete_exerciese for : {exercise.workout_day.workout_plan.user}, at a planned_exercise with id:{id}")
        return Response({"message":"You are not authorized to delete this exercise"},status=status.HTTP_403_FORBIDDEN)
    exercise.delete()
    logger.info(f"Request accepted - {request.user} deleted the exercise : {exercise.exercise.name_of_exercise} succesfully")
    return Response({"message":"Exercise deleted successfully"},status=status.HTTP_204_NO_CONTENT)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_cardio(request,id):
    logger.debug(f"The view delete_cardio is called by {request.user}")
    cardio=get_object_or_404(PlannedCardio,id=id)
    if cardio.workout_day.workout_plan.user!=request.user:
        logger.warning(f"Request Denied - the user : {request.user} tried to delete_cardio for : {cardio.workout_day.workout_plan.user}, at a cardio with id:{id}")
        return Response({"message":"You are not authorized to delete this cardio"},status=status.HTTP_403_FORBIDDEN)
    cardio.delete()
    logger.info(f"Request accepted - {request.user} deleted the cardio : {cardio.exercise.name_of_exercise} succesfully")
    return Response({"message":"Cardio deleted successfully"},status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_exercise(request):
    logger.debug(f"The view add_exercise is called by {request.user}")
    serializer = PlannedExerciseSerializer(data=request.data,context={"request":request})
    if serializer.is_valid():
        exercise=serializer.save()
        exercise.save()
        logger.info(f"Request accepted - the exercise {exercise.exercise.name_of_exercise} is added for the user {request.user}")
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    logger.warning(f"Request Denied - the information is unvalid for the Serializer to add the exercise for the user {request.user}")
    return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)
        
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_cardio(request):
    logger.debug(f"The view add_cardio is called by {request.user}")
    serializer = PlannedCardioSerializer(data=request.data,context={"request":request})
    if serializer.is_valid():
        cardio=serializer.save()
        cardio.save()
        logger.info(f"Request accepted - the cardio {cardio.exercise.name_of_exercise} is added for the user {request.user}")
        return Response(serializer.data,status=status.HTTP_201_CREATED)
    logger.warning(f"Request Denied - the information is unvalid for the Serializer to add the cardio for the user {request.user}")
    return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

def index(request):
    logger.debug(f"The view index is called by {request.user}")
    if  not request.user.is_authenticated:
        logger.warning(f"Reqeust Denied - the user is not registered yet")
        return HttpResponseRedirect(reverse('main:register'))
    x = UserGoal.objects.filter(user=request.user).exists()
    plan=WorkoutPlan.objects.filter(user=request.user,is_active=True).first()#.first() does: return the first object in the queryset, if no object is found, it returns None
    if plan:
        days=plan.workoutday_set.all()#this does: return all the workout days for the current user as a set of objects
        all_exercises=PlannedExercise.objects.filter(workout_day__in=days)#this does: return all the exercises for the current user as a set of objects
        all_cardios=PlannedCardio.objects.filter(workout_day__in=days)#this does: return all the cardio exercises for the current user as a set of objects
        logger.info(f"Request Accepted - {request.user} is seeing his workout plan")
        return render(request,'main/index.html',{
            "user":request.user,
            "alreadyEnteredInfo":x,
            "days":days,
            "all_exercises":all_exercises,
            "all_cardios":all_cardios
        })
    logger.info(f"Request Accepted - {request.user} didn't insert his goal")
    return render(request,'main/index.html',{
        "user":request.user,
        "alreadyEnteredInfo":x
    })
@login_required
def submit_goal(request):
    logger.debug(f"The view submit_goal is being submited by {request.user} and the function generate_plan is called")
    if request.method=="POST":
        goal=request.POST["goal"]
        days_wanna_play=int( request.POST["days_wanna_play"])
        description=request.POST["description"]
        try:
            user_goal = UserGoal.objects.create(goal=goal, days_wanna_play=days_wanna_play, description=description, user=request.user)
            WorkoutPlan.objects.filter(user=request.user,is_active=True).update(is_active=False)
            #user_goal.save()
            plan = generate_plan(user_goal)
            logger.info(f"Request Accpeted - {request.user} has made his workout_plan")
            return redirect('main:index')
        except ValidationError as e:
            logger.warning(f"Request Denied - {request.user} didn't enter the right information to store in the goal")
            return render(request,"main/index.html",{
                "user":request.user,
                "alreadyEnteredInfo":False,
                "message":e.message
            })
    else:
        logger.warning(f"Request Denied - wrong requeset by {request.user}")
        return render(request,"main/index.html",{
            "user":request.user,
            "alreadyEnteredInfo":False,
            "message":"Please fill all the fields"
        })
            
        
        

def login_view(request):
    logger.debug(f"The view login_view is called by {request.user}")
    if request.method=="POST":
        username=request.POST['username']
        password=request.POST['password']
        if not password or not username:
            logger.info(f"Reqeust Denied - unValid cradentials for logging")
            return render(request,"main/login.html",{
                "message":"Please fill all the fields"
            })
        if username[0].isdigit():
            logger.warning(f"Reqeust Denied - username can't be number for logging")
            return render(request,"main/login.html",{
                "message":"Username cannot start with a number"
            })
        user=authenticate(request,username=username,password=password)
        if user is not None:
            login(request,user)
            logger.info(f"Request Accepeted - {username} is Logged in")
            return HttpResponseRedirect(reverse('main:index'))
        else:
            logger.warning(f"Request Denied - username : {username} tried to login")
            return render(request,"main/login.html",{
                'message':'Invalid username or password'
            })
    else:
        return render(request,'main/login.html')

def logout_view(request):
    logger.debug(f"The view logout_view is being called by {request.user}")
    user = request.user
    logout(request)
    logger.info(f"Reqeust Accepted - {user} Logged out ")
    return HttpResponseRedirect(reverse('main:index'))

def register(request):
    logger.debug(f"The view register is called by {request.user}")
    if request.method=="POST":
        username=request.POST["username"]
        email=request.POST["email"]
        password=request.POST["password"]
        if not username or not email or not password:
            logger.info(f"Reqeust Denied - unValid cradentials for registering")
            return render(request,"main/register.html",{
                "message":"Please fill all the fields"
            })
        if username[0].isdigit():
            logger.warning(f"Reqeust Denied - username can't be number when registering")
            return render(request,"main/register.html",{
                "message":"Username cannot start with a number"
            })
        try:
            user=User.objects.create_user(username,email,password)
            user.save()
            
        except IntegrityError:
            logger.warning(f"Request Denied - username is already taken, registering is not valid")
            return render(request,"main/register.html",{
                "message":"UserName already taken"
            })
        login(request,user)
        logger.info(f"Reqeust Accepted - the user is registered succesfull with Username: {username}")
        return HttpResponseRedirect(reverse("main:index"))
    else:
        return render(request,'main/register.html')

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_session(request):
    """Return the user's current active (incomplete) WorkoutSession, or null."""
    logger.debug(f"The view active_session is called by {request.user}")
    session = WorkoutSession.objects.filter(
        user=request.user, is_completed=False
    ).select_related("workout_day").first()

    if not session:
        logger.info(f"Request Accepted - {request.user} has no active session ")
        return Response({"session": None}, status=status.HTTP_200_OK)
    logger.info(f"Request Accpeted - the active session for {request.user} is being fetched")
    return Response({
        "session": {
            "id": session.id,
            "workout_day": session.workout_day.id,
            "date": str(session.date),
            "is_completed": session.is_completed,
        }
    }, status=status.HTTP_200_OK)


def custom_404(request,exception = None):
    logger.debug(f"The view custom_404 is called")
    referer = request.META.get('HTTP_REFERER')
    if referer:
        logger.debug(f"The view custom_404 is called by {request.user} and redirecting to the previous page")
        return redirect(referer)
    if request.user.is_authenticated:
        logger.debug(f"The view custom_404 is called by {request.user} and redirecting to the index page (workout plan page)")
        return redirect('main:index')
    else:
        logger.debug(f"The view custom_404 is called by Unknown user (Not Authenticated)")
        return redirect('main:login_view')
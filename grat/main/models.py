from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

"""
User AbstractUser model is used for abstract knowladge about the user
all of the data are the same unless the user himself change the field
(which will be possible in the future)
"""

class User(AbstractUser):
    current_weight=models.DecimalField(max_digits=5,decimal_places=2,null=True,blank=True)#999.99
    current_height=models.IntegerField(null=True,blank=True)
    birth_date=models.DateField(null=True,blank=True)## make it date field attribute--> DONE
    current_gender=models.CharField(max_length=32,null=True,blank=True)## Chlices 
    def __str__(self):
        return f"{self.username}, Email: {self.email}"
"""
the UserGoal model store users information needed for the app to run for the user's needs:

user :for authentication.
goal : bulk/cut.
description for his goal and situation (for futrue use of ai)
days_wanna_play: how many days the user can play a week

e.g:
request.user, bulking, i wanna look musculer, 4 days/week.
"""
class UserGoal(models.Model):
    types_of_goals=[
        ("bulk","Bulk"),
        ("cut","Cut")
    ]
    number_of_days_in_week=[
        (3,"3 days"),
        (4,"4 days"),
        (5,"5 days")
    ]
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    goal=models.CharField(max_length=32,choices=types_of_goals)#bulk/cut
    description=models.TextField()
    days_wanna_play=models.IntegerField(choices=number_of_days_in_week)
    def __str__(self):
        return f"{self.user.username}'s Goal is {self.goal} in {self.days_wanna_play} days/week"

"""
the ExerciseLibrary model is designed to store :
The general knowladge about an exercise (name, muscle group, etc..) and a URL link to a video that explains how to do it
 
muscle_group: leg, chest, etc..
name_of_exercise: leg extention, etc...
exercise_url: https://eg.com

e.g:

muscle_group: leg. name_of_exercise: leg extention. exercise_url: eg.com 
"""

class ExerciseLibrary(models.Model):
    types_of_days=[
        ("chest","Chest"),
        ("back","Back"),
        ("leg","Leg"),
        ("bicpe","Bicpe"),
        ("tricpe","Tricpe"),
        ("shoulder","Shoulder"),
        ("abs","Abs"),
        ("cardio","Cardio")
    ]
    muscle_group=models.CharField(max_length=64,choices=types_of_days)# fixed names: leg, chest, back, bicpe, tricpe, shoulder, abs
    name_of_exercise=models.CharField(max_length=300,unique=True)
    exercise_url=models.URLField(blank=True,null=True)
    is_cardio=models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.muscle_group} : {self.name_of_exercise}"
"""
WorkoutPlan model is designed to store :

user :for authentication.
goal : is an object from UserGoal, to help generate the needed WorkoutPlan.
plan_split: the type of workout plan (PPL, CBAL, FF, CBLAS, CBLASC).
is_active: True if the plan is active, False otherwise.

e.g:
user: user1, goal: bulking, plan_split: PPL, is_active: True
"""

class WorkoutPlan(models.Model):
    types_of_workout_plan=[
        ("PPL", "Push/Pull/Legs"),
        ("CBAL", "Chest/Back/Arms/Legs"),
        ("FF", "Full Body/Full Body"),
        ("CBLAS","Chest/Back/Legs/Arms/Shoulders"),
        ("CBLASC","Chest/Back/Legs/Arms/Shoulders/Cardio")
    ]
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    goal=models.ForeignKey(UserGoal,on_delete=models.CASCADE)
    plan_split=models.CharField(max_length=32,choices=types_of_workout_plan,null=True,blank=True)
    is_active=models.BooleanField(default=True)# activate the current workout plan, IF False then another PLAN IS ACTIVATED.
    def __str__(self):
        return f"{self.user.username}'s workout plan: {self.plan_split} for {self.goal.goal} in {self.goal.days_wanna_play} days/week"

"""
WorkoutDay model is designed to store the days of the workout plan.

workout_plan: is an object from WorkoutPlan, to help generate the needed WorkoutDay.
day: the day of the workout plan (Day1, Day2, etc...)OR(Push, Pull, Legs, etc...) 

e.g:
workout_plan: user1's workout plan, day: Day1
"""

class WorkoutDay(models.Model):
    workout_plan=models.ForeignKey(WorkoutPlan,on_delete=models.CASCADE)
    day=models.IntegerField()# Day1, Day2, etc...
    def __str__(self):
        return f"{self.workout_plan.user.username}'s workout day: {self.day}"
"""
PlannedExercise model is designed to store the exercises that are planned for the workout day.

workout_day: is an object from WorkoutDay, to help generate the needed PlannedExercise.
exercise: is an object from ExerciseLibrary, to help generate the needed PlannedExercise (ChestPress, pullup, etc...).
sets: the number of sets for the exercise.
reps: the number of reps for the exercise.
order: the order of the exercise in the workout day.

e.g:
workout_day: user1's workout day, exercise: leg extention, sets: 3, reps: 10, order: 1
"""

class PlannedExercise(models.Model):
    workout_day=models.ForeignKey(WorkoutDay,on_delete=models.CASCADE)
    exercise=models.ForeignKey(ExerciseLibrary,on_delete=models.CASCADE)

    # sets and reps
    sets=models.IntegerField()
    reps=models.IntegerField()

    order = models.IntegerField()  # position in workout
    def __str__(self):
        return f"{self.workout_day.workout_plan.user.username}'s workout plan: {self.exercise.name_of_exercise}"
"""
PlannedCardio model is designed to store the cardio exercises that are planned for the workout day.

workout_day: is an object from WorkoutDay, to help generate the needed PlannedCardio.
exercise: is an object from ExerciseLibrary, to help generate the needed PlannedCardio (running, cycling, etc...).
duration_in_minutes: the duration of the cardio exercise in minutes.
distance_in_km: the distance of the cardio exercise in kilometers.
order: the order of the cardio exercise in the workout day(optional by the user, if not provided, it will be the last thing to be added to the workout day).

e.g:
workout_day: user1's workout day, exercise: running, duration_in_minutes: 30, distance_in_km: 5, order: 1
"""
class PlannedCardio(models.Model):
    workout_day=models.ForeignKey(WorkoutDay,on_delete=models.CASCADE)
    exercise=models.ForeignKey(ExerciseLibrary,on_delete=models.CASCADE)

    duration_in_minutes=models.DecimalField(max_digits=5,decimal_places=2)
    distance_in_km=models.DecimalField(max_digits=5,decimal_places=2)
    
    #Order should be the last thing to be added to the workout day
    order=models.IntegerField()
    def __str__(self):
        return f"{self.workout_day.workout_plan.user.username}'s workout plan: {self.exercise.name_of_exercise}"


"""
WorkoutSession model is designed to store the sessions of the workout plan for on specific day.

user: is an object from User, to help gather up the WorkoutSession.
workout_day: is an object from WorkoutDay, to help generate the needed WorkoutSession.
date: the date of the workout session.

e.g:
user: user1, workout_day: user1's workout day, date: 2022-01-01
"""
class WorkoutSession(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    workout_day=models.ForeignKey(WorkoutDay,on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    is_completed=models.BooleanField(default=False)
    def __str__ (self):
        return f"{self.user.username}'s workout day: {self.workout_day.day} on {self.date}"
"""
SetProgress models designed to store and track the progress of the user in each set of every exercise.

workout_session: is an object from WorkoutSession, to help track the needed exercise sets on a specific session.
exercise: is an object from PlannedExercise, to help track the needed exercise sets.
current_weight: the weight the user lifted in the set.
set_number: the number of the set.
reps: the number of reps the user lifted in the set.

e.g:
workout_session: user1's workout session, exercise: leg extention, current_weight: 100, set_number: 1, reps: 10
"""

class SetProgress(models.Model):
    workout_session=models.ForeignKey(WorkoutSession,on_delete=models.CASCADE)
    exercise=models.ForeignKey(PlannedExercise,on_delete=models.CASCADE)

    current_weight=models.DecimalField(max_digits=5,decimal_places=2)
    set_number=models.IntegerField()
    reps=models.IntegerField()

    def __str__(self):
        return f"{self.workout_session.user.username}'s workout plan: {self.exercise.name_of_exercise} {self.set_number}*{self.reps}"
"""
CardioProgress model is designed to store and track the progress of the user in each cardio exercise.

workout_session: is an object from WorkoutSession, to help track the needed cardio exercises on a specific session.
exercise: is an object from PlannedCardio, to help track the needed cardio exercises.
duration_in_minutes: the duration of the cardio exercise in minutes.
distance_in_km: the distance of the cardio exercise in kilometers.

e.g:
workout_session: user1's workout session, exercise: running, duration_in_minutes: 30, distance_in_km: 5
"""
class CardioProgress(models.Model):
    workout_session=models.ForeignKey(WorkoutSession,on_delete=models.CASCADE)
    exercise=models.ForeignKey(PlannedCardio,on_delete=models.CASCADE)

    duration_in_minutes=models.DecimalField(max_digits=5,decimal_places=2)
    distance_in_km=models.DecimalField(max_digits=5,decimal_places=2)

    def __str__(self):
        return f"{self.workout_session.user.username}'s workout plan: {self.exercise.name_of_exercise} for {self.duration_in_minutes} mins, and {self.distance_in_km} km"
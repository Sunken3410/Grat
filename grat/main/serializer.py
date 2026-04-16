from rest_framework import serializers
from .models import(
    User,WorkoutPlan,WorkoutDay,PlannedExercise,
    PlannedCardio,ExerciseLibrary,UserGoal,WorkoutSession,
    CardioProgress,SetProgress
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model= User
        fields=["username"]

class UserGoalSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model= UserGoal
        fields=["goal","days_wanna_play","description","user"]
    def validate_days_wanna_play(self,value):
        if 0<=value <= 5:
            return value
        raise serializers.ValidationError("Days wanna play cannot be negative")
    def validate_goal(self,value):
        if value in ["bulk","cut"]:
            return value
        raise serializers.ValidationError("Invalid goal")

class ExerciseLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model= ExerciseLibrary
        fields=["muscle_group","name_of_exercise","exercise_url","is_cardio","is_active"]
    def validate_muscle_group(self,value):
        if value in ["chest","back","leg","bicpe","tricpe","shoulder","abs","cardio"]:
            return value
        raise serializers.ValidationError("Invalid muscle group")
    def validate_name_of_exercise(self,value):
        if ExerciseLibrary.objects.filter(name_of_exercise=value).exists():
            raise serializers.ValidationError("Exercise already exists")
        return value
    def validate_exercise_url(self,value):
        if not value.startswith("https://"):
            raise serializers.ValidationError("Invalid URL")
        return value
    def validate_is_cardio(self,value):
        if value in [True,False]:
            return value
        raise serializers.ValidationError("Invalid value")
    def validate_is_active(self,value):
        if value in [True,False]:
            return value
        raise serializers.ValidationError("Invalid value")
    
class WorkoutPlanSerializer(serializers.ModelSerializer):
    user=UserSerializer(read_only=True)
    goal=UserGoalSerializer(read_only=True)
    class Meta:
        model= WorkoutPlan
        fields=["user","goal","plan_split","is_active"]
    def validate_plan_split(self,value):
        if value in ["PPL","CBAL","FF","CBLAS","CBLASC"]:
            return value
        raise serializers.ValidationError("Invalid plan split")
    def validate_is_active(self,value):
        if value in [True,False]:
            return value
        raise serializers.ValidationError("Invalid value")

class WorkoutDaySerializer(serializers.ModelSerializer):
    workout_plan= WorkoutPlanSerializer(read_only=True)
    class Meta:
        model= WorkoutDay
        fields=["workout_plan","day"]
    def validate_day(self,value):
        if 0<value<=5:
            return value
        raise serializers.ValidationError("Invalid day")
    
class PlannedExerciseSerializer(serializers.ModelSerializer):
    workout_day= serializers.PrimaryKeyRelatedField(queryset=WorkoutDay.objects.all())
    exercise= serializers.PrimaryKeyRelatedField(queryset=ExerciseLibrary.objects.filter(is_cardio=False))
    class Meta:
        model= PlannedExercise
        fields=["workout_day", "exercise","reps","sets","order"]
    def validate_reps(self,value):
        if 0<value<=20:
            return value
        raise serializers.ValidationError("Invalid reps")
    def validate_sets(self,value):
        if 0<value<=20:
            return value
        raise serializers.ValidationError("Invalid sets")
    def validate_order(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid order")
    def validate(self,attrs):#What does the attrs does? it is a dictionary that contains the data that is being sent to the serializer.
        if attrs["exercise"].is_cardio:
            raise serializers.ValidationError("Exercise is cardio")
        return attrs

class PlannedCardioSerializer(serializers.ModelSerializer):
    workout_day= serializers.PrimaryKeyRelatedField(queryset=WorkoutDay.objects.all())
    exercise= serializers.PrimaryKeyRelatedField(queryset=ExerciseLibrary.objects.filter(is_cardio=True))
    class Meta:
        model= PlannedCardio
        fields=["workout_day", "exercise","duration_in_minutes","distance_in_km","order"]
    def validate_duration_in_minutes(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid duration in minutes")
    def validate_distance_in_km(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid distance in km")
    def validate_order(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid order")
    def validate(self,attrs):#What does the attrs does? it is a dictionary that contains the data that is being sent to the serializer.
        if not attrs["exercise"].is_cardio:
            raise serializers.ValidationError("Exercise is not cardio")
        return attrs


class WorkoutSessionSerializer(serializers.ModelSerializer):
    user=UserSerializer(read_only=True)
    workout_day= WorkoutDaySerializer(read_only=True)
    class Meta:
        model= WorkoutSession
        fields=["user","workout_day","date","is_completed"]
    def validate_is_completed(self,value):
        if value in [True,False]:
            return value
        raise serializers.ValidationError("Invalid value")

class SetProgressSerializer(serializers.ModelSerializer):
    workout_session= WorkoutSessionSerializer(read_only=True)
    planned_exercise= PlannedExerciseSerializer(read_only=True)
    class Meta:
        model= SetProgress
        fields=["workout_session","planned_exercise","reps","weight","current_weight"]
    def validate_reps(self,value):
        if 0<value<=20:
            return value
        raise serializers.ValidationError("Invalid reps")
    def validate_weight(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid weight")
    def validate_current_weight(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid current weight")

class CardioProgressSerializer(serializers.ModelSerializer):
    workout_session= WorkoutSessionSerializer(read_only=True)
    planned_cardio= PlannedCardioSerializer(read_only=True)
    class Meta:
        model= CardioProgress
        fields=["workout_session","planned_cardio","duration_in_minutes","distance_in_km"]
    def validate_duration_in_minutes(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid duration in minutes")
    def validate_distance_in_km(self,value):
        if 0<value:
            return value
        raise serializers.ValidationError("Invalid distance in km")

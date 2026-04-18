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
        #unique_together = ("workout_day", "exercise")

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
        request=self.context["request"]
        if PlannedExercise.objects.filter(workout_day=attrs["workout_day"],exercise=attrs["exercise"]).exists():
            raise serializers.ValidationError("Exercise already exists in this workout day")
        if request.user != attrs["workout_day"].workout_plan.user:
            raise serializers.ValidationError({
            "workout_day": "Not your workout"
            })

        return attrs

class PlannedCardioSerializer(serializers.ModelSerializer):

    workout_day= serializers.PrimaryKeyRelatedField(queryset=WorkoutDay.objects.all())
    exercise= serializers.PrimaryKeyRelatedField(queryset=ExerciseLibrary.objects.filter(is_cardio=True))
    
    class Meta:
        model= PlannedCardio
        fields=["workout_day", "exercise","duration_in_minutes","distance_in_km","order"]
        #unique_together = ("workout_day", "exercise")
    
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
        request=self.context["request"]
        
        if request.user != attrs["workout_day"].workout_plan.user:
            raise serializers.ValidationError({
    "workout_day": "Not your workout"
})
        return attrs


class WorkoutSessionSerializer(serializers.ModelSerializer):
    user=serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    workout_day= serializers.PrimaryKeyRelatedField(queryset=WorkoutDay.objects.all())
    
    class Meta:
        model= WorkoutSession
        fields=["user","workout_day","date","is_completed"]

    def validate(self,attrs):
        request=self.context["request"]
        if request.user != attrs["user"]:
            raise serializers.ValidationError({
                "workout_session":"Not your workout"
            })
        
        return attrs# what does this do? answer: it returns the validated data

class SetProgressSerializer(serializers.ModelSerializer):
    workout_session= serializers.PrimaryKeyRelatedField(queryset=WorkoutSession.objects.all())
    planned_exercise= serializers.PrimaryKeyRelatedField(queryset=PlannedExercise.objects.all())
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
    def validate(self,attrs):
        request= self.context["request"]
        if request.user != attrs["workout_session"].user:
            raise serializers.ValidationError({
                "workout_session":"Not your workout"
            })
        if attrs["workout_session"].is_completed:
            raise serializers.ValidationError({
                "workout_session":"Session is already completed"
            })
        if attrs["planned_exercise"].workout_day != attrs["workout_session"].workout_day:
            raise serializers.ValidationError({
                "planned_exercise":"Exercise is not in this workout day"
            })
        return attrs

class CardioProgressSerializer(serializers.ModelSerializer):
    workout_session= serializers.PrimaryKeyRelatedField(queryset=WorkoutSession.objects.all())
    planned_cardio= serializers.PrimaryKeyRelatedField(queryset=PlannedCardio.objects.all())
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
    def validate(self, attrs):
        request= self.context["request"]
        if request.user != attrs["workout_session"].user:
            raise serializers.ValidationError({
                "workout_session": "not your workout_session"
            })
        if attrs["workout_session"].is_completed:
            raise serializers.ValidationError({
                "workout_session": "Session is already completed"
            })
        if attrs["planned_cardio"].workout_day != attrs["workout_session"].workout_day:
            raise serializers.ValidationError({
                "planned_cardio": "Cardio is not in this workout day"
            })
        return attrs
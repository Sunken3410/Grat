import json
import random
from django.db import transaction
import os
from django.conf import settings

from main.models import (
    UserGoal,
    WorkoutPlan,
    WorkoutDay,
    PlannedExercise,
    PlannedCardio,
    ExerciseLibrary)

def load_rules():
    with open(os.path.join(settings.BASE_DIR, "main", "data", "exercise_rules.json")) as f:
        return json.load(f)


def get_split(days):
    if days == 3:
        return [
            ["chest", "tricep", "shoulder"],
            ["back", "bicep", "shoulder"],
            ["leg", "abs"]
        ]
    elif days == 4:
        return [
            ["chest", "tricep", "shoulder"],
            ["back", "bicep", "shoulder"],
            ["leg", "abs"],
            ["chest", "back", "shoulder"]
        ]
    elif days == 5:
        return [
            ["chest", "tricep", "shoulder"],
            ["back", "bicep", "shoulder"],
            ["leg", "abs"],
            ["chest", "shoulder", "tricep"],
            ["back", "bicep", "abs"]
        ]
    else:
        raise ValueError("Unsupported number of days")


@transaction.atomic # if there is an error, cancel the whole transaction (rollback) and save nothing
def generate_plan(user_goal):
    # 1. Load rules
    rules = load_rules()

    # 2. Decide split
    split = get_split(user_goal.days_wanna_play)

    # 3. Deactivate old plans
    WorkoutPlan.objects.filter(user=user_goal.user, is_active=True).update(is_active=False)

    # 4. Create new plan
    plan = WorkoutPlan.objects.create(
        user=user_goal.user,
        goal=user_goal,
        is_active=True
    )

    # 5. Loop over days
    for day_index, muscles in enumerate(split):
        day = WorkoutDay.objects.create(
            workout_plan=plan,
            day=day_index + 1
        )

        exercise_order = 0

        # 6. Assign exercises
        for muscle in muscles:
            num_exercises = rules.get(muscle, 1)# change the get to filter......................................

            exercises = list(
                ExerciseLibrary.objects.filter(
                    muscle_group=muscle,#focus on the naming
                    is_active=True
                )
            )

            random.shuffle(exercises)
            selected = exercises[:num_exercises]# if the num_exercises is greater than the number of exercises in the database, it will return all the exercises in the database

            for ex in selected:
                PlannedExercise.objects.create(
                    workout_day=day,
                    exercise=ex,
                    sets=3,          # assumption
                    reps=10,         # assumption
                    order=exercise_order
                )
                exercise_order += 1

        # 7. Assign cardio (ALWAYS present, intensity varies)
        if user_goal.goal == "cut":
            duration = 40
        else:  # bulk
            duration = 20

        PlannedCardio.objects.create(
            workout_day=day,
            exercise=ExerciseLibrary.objects.get(name_of_exercise="Running"),
            duration_in_minutes=duration,
            distance_in_km=0  # optional / can be null
            ,order=exercise_order
        )

    return plan
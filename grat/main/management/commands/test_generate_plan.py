from django.core.management.base import BaseCommand
from main.models import UserGoal
from main.service.generate_plan import generate_plan

class Command(BaseCommand):
    help = "Test generate_plan function"

    def handle(self, *args, **kwargs):
        user_goal = UserGoal.objects.first()  # or filter by id
        plan = generate_plan(user_goal)

        for day in plan.workoutday_set.all():
            print(day.day, list(day.plannedexercise_set.values_list('exercise__name_of_exercise', flat=True)))
            print(day.plannedcardio_set.first().duration_in_minutes)
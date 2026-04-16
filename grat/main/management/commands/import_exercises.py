import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from main.models import ExerciseLibrary


class Command(BaseCommand):
    help = 'Import and sync exercises from CSV'

    def handle(self, *args, **kwargs):
        file_path = os.path.join(settings.BASE_DIR, 'main', 'data', 'exercises.csv')

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR("CSV file not found"))
            return

        #Deactivate all
        ExerciseLibrary.objects.all().update(is_active=False)

        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                name = row['name_of_exercise'].strip()
                muscle_group = row['muscle_group'].strip()
                is_cardio = row['is_cardio'].strip().lower() == 'true'
                exercise_url = row.get('exercise_url', '').strip()

                exercise, created = ExerciseLibrary.objects.get_or_create(
                    name_of_exercise=name,
                    defaults={
                        "muscle_group": muscle_group,
                        "is_cardio": is_cardio,
                        "exercise_url": exercise_url,
                        "is_active": True
                    }
                )

                if not created:
                    # update existing
                    exercise.muscle_group = muscle_group
                    exercise.is_cardio = is_cardio
                    exercise.exercise_url = exercise_url
                    exercise.is_active = True
                    exercise.save()

                    self.stdout.write(self.style.WARNING(f"Updated: {name}"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"Added: {name}"))

        self.stdout.write(self.style.SUCCESS("Sync completed successfully"))
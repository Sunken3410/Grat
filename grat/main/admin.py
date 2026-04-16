from django.contrib import admin
from .models import ExerciseLibrary
# Register your models here.

@admin.register(ExerciseLibrary)
class ExerciseLibraryAdmin(admin.ModelAdmin):
    list_display=('name_of_exercise','muscle_group','is_cardio','is_active','exercise_url')
    list_filter=('muscle_group','is_cardio','is_active')
    search_fields=('name_of_exercise','muscle_group')
    ordering=('muscle_group','name_of_exercise')
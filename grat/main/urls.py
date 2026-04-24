from django.urls import path
from . import views
from django.contrib import admin

app_name = "main"

urlpatterns = [
    path("", views.index, name="index"),
    path("login/", views.login_view, name="login_view"),
    path("logout/", views.logout_view, name="logout_view"),
    path("register/", views.register, name="register"),
    path("submit_goal/",views.submit_goal,name="submit_goal"),
    path('admin/', admin.site.urls),
    path("add_exercise/",views.add_exercise,name="add_exercise"),
    path("add_cardio/",views.add_cardio,name="add_cardio"),
    path("delete_exercise/<int:id>/",views.delete_exercise,name="delete_exercise"),
    path("delete_cardio/<int:id>/",views.delete_cardio,name="delete_cardio"),
    path("start_session/",views.start_session,name="start_session"),
    path("end_session/",views.end_session,name="end_session"),
    path("track_set/",views.track_set,name="track_set"),
    path("track_cardio/",views.track_cardio,name="track_cardio"),
    path("get_all_exercises/",views.get_all_exercises,name="get_all_exercises"),
    path("last_tracked_sets/<int:planned_exercise_id>/<int:limit>/",views.last_tracked_sets,name="last_tracked_sets"),
    path("last_tracked_cardio/<int:planned_cardio_id>/<int:limit>/",views.last_tracked_cardio,name="last_tracked_cardio"),
    path("active_session/",views.active_session,name="active_session"),
    ]
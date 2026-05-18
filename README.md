# Grat

Grat is a Django workout planning and tracking app for beginners. Users register, choose a fitness goal and weekly training frequency, receive a generated workout plan, then track strength sets, cardio sessions, and recent performance over time.

The backend uses Django with Django REST Framework-style API views, Django session authentication, CSRF protection, and a relational database configured through `DATABASE_URL`. The frontend is served by Django templates with vanilla JavaScript calling the JSON endpoints.

## Tech Stack

- Python, Django 6
- Django REST Framework
- Django session authentication and CSRF protection
- PostgreSQL-ready database config via `dj-database-url` and `psycopg2-binary`
- WhiteNoise for static file serving
- Vanilla JavaScript, HTML, and CSS templates
- CSV/JSON-backed exercise seed data

## Backend Features

- Custom `User` model with optional profile fields such as weight, height, birth date, and gender.
- Goal setup for `bulk` or `cut` with 3, 4, or 5 training days per week.
- Automatic workout plan generation from exercise rules and the exercise library.
- Active/inactive workout plan lifecycle so older plans are preserved.
- Workout day templates with planned strength exercises and cardio.
- Runtime `WorkoutSession` records for workout history.
- Set tracking with reps, set number, and current weight.
- Cardio tracking with duration and distance.
- Previous-performance endpoints for recent sets and cardio history.
- Ownership checks so users can only mutate their own plans, sessions, and progress.

## Folder Structure

```text
FinalProject/
|-- README.md
|-- .env
|-- claude.md
`-- grat/
    |-- manage.py
    |-- requirements.txt
    |-- build.sh
    |-- grat/
    |   |-- settings.py
    |   |-- urls.py
    |   |-- asgi.py
    |   `-- wsgi.py
    `-- main/
        |-- admin.py
        |-- apps.py
        |-- middleware.py
        |-- models.py
        |-- serializer.py
        |-- urls.py
        |-- views.py
        |-- data/
        |   |-- exercises.csv
        |   `-- exercise_rules.json
        |-- management/commands/
        |   |-- import_exercises.py
        |   `-- test_generate_plan.py
        |-- service/
        |   `-- generate_plan.py
        |-- static/main/
        |   |-- dynamic.js
        |   |-- main.css
        |   `-- styles.css
        `-- templates/main/
            |-- index.html
            |-- layout.html
            |-- login.html
            |-- logreglayout.html
            `-- register.html
```

## Data Model Overview

- `User`: custom auth user.
- `UserGoal`: selected goal, description, and weekly training days.
- `ExerciseLibrary`: reusable exercises, muscle group, video URL, cardio flag, and active status.
- `WorkoutPlan`: active or historical generated plan for a user.
- `WorkoutDay`: day template inside a plan.
- `PlannedExercise`: strength exercise assigned to a workout day.
- `PlannedCardio`: cardio exercise assigned to a workout day.
- `WorkoutSession`: runtime workout instance for a user and workout day.
- `SetProgress`: tracked sets for a session exercise.
- `CardioProgress`: tracked cardio output for a session cardio item.

## API Endpoints

All JSON API endpoints below require an authenticated Django session and CSRF token for unsafe methods.

| Method | Route | Description | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Render the dashboard for authenticated users or redirect unauthenticated users to registration. | HTML page with injected workout data. |
| `GET` | `/register/` | Render registration form. | HTML form. |
| `POST` | `/register/` | Create a user, log them in, and redirect to the dashboard. | Redirect or validation message. |
| `GET` | `/login/` | Render login form. | HTML form. |
| `POST` | `/login/` | Authenticate credentials and create a session. | Redirect or validation message. |
| `GET` | `/logout/` | End the current session. | Redirect to dashboard/register flow. |
| `GET` | `/admin/` | Open the Django admin interface. | Admin HTML UI. |
| `POST` | `/submit_goal/` | Save a user goal, deactivate previous active plans, and generate a new plan. | Redirect to dashboard or validation message. |
| `GET` | `/get_all_exercises/` | Return active exercises. Optional query: `?group=chest`. | Array of exercise library objects. |
| `POST` | `/add_exercise/` | Add a planned strength exercise to one of the user's workout days. | Created planned exercise data. |
| `DELETE` | `/delete_exercise/<id>/` | Delete a planned strength exercise owned by the current user. | Success message, `204`. |
| `POST` | `/add_cardio/` | Add a planned cardio exercise to one of the user's workout days. | Created planned cardio data. |
| `DELETE` | `/delete_cardio/<id>/` | Delete planned cardio owned by the current user. | Success message, `204`. |
| `POST` | `/start_session/` | Start a workout session for a workout day. Only one incomplete session is allowed per user. | Created workout session data. |
| `GET` | `/active_session/` | Return the current incomplete session, if one exists. | `{ "session": {...} }` or `{ "session": null }`. |
| `PUT` | `/end_session/` | Mark a workout session as completed. Body: `{ "id": session_id }`. | Success message. |
| `POST` | `/track_set/` | Track a strength set. Body includes `workout_session`, `planned_exercise`, `reps`, `set_number`, and `current_weight`. | Created set progress data. |
| `POST` | `/track_cardio/` | Track cardio progress. Body includes `workout_session`, `planned_cardio`, `duration_in_minutes`, and `distance_in_km`. | Created cardio progress data. |
| `GET` | `/last_tracked_sets/<planned_exercise_id>/<limit>/` | Return recent tracked sets for the same exercise from the previous matching session. | `{ "data": [...], "message": "..." }`. |
| `GET` | `/last_tracked_cardio/<planned_cardio_id>/<limit>/` | Return recent tracked cardio entries for the same cardio exercise from the previous matching session. | `{ "data": [...], "message": "..." }`. |

## Environment Variables

Create a `.env` file in the project root or provide these variables in the runtime environment:

```env
DEBUG=True
SECRET_KEY=replace-with-a-secure-secret
DATABASE_URL=sqlite:///grat/db.sqlite3
ALLOWED_HOSTS=127.0.0.1,localhost
```

Notes:

- `SECRET_KEY` is required by `grat/settings.py`.
- `DATABASE_URL` is required and parsed by `dj-database-url`. Use a PostgreSQL URL in production, for example `postgres://USER:PASSWORD@HOST:PORT/DB_NAME`.
- `ALLOWED_HOSTS` defaults to `127.0.0.1` if omitted, but should be explicit for local and deployed environments.
- Never commit real production secrets.

## Local Setup

From the repository root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r grat/requirements.txt
python grat/manage.py migrate
python grat/manage.py import_exercises
python grat/manage.py createsuperuser
python grat/manage.py runserver
```

Then open:

```text
http://127.0.0.1:8000/
```

## Database Setup

The app expects a relational database through `DATABASE_URL`.

For quick local development, use SQLite:

```env
DATABASE_URL=sqlite:///grat/db.sqlite3
```

For production, use PostgreSQL:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
```

After configuring the database, run:

```bash
python grat/manage.py migrate
python grat/manage.py import_exercises
```

`import_exercises` syncs `main/data/exercises.csv` into `ExerciseLibrary`, deactivating missing exercises and updating existing ones.

## Authentication and Security

Grat uses Django's built-in session authentication, not JWT. Login and registration are form-based, authenticated API calls use the browser session cookie, and unsafe requests include the `X-CSRFToken` header from the `csrftoken` cookie.

Backend endpoints use `IsAuthenticated` for protected JSON APIs. Serializers and views also validate object ownership so users cannot modify another user's workout day, session, exercise, or cardio progress.

## Deployment Notes

`build.sh` is prepared for hosted deployment workflows:

```bash
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
```

Static files are collected into `staticfiles/` and served with WhiteNoise.

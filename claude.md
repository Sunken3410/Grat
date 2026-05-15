# 🧠 PROJECT CONTEXT — GRAT (Workout App)

## Overview
Grat is a web application designed for beginners to:
- generate structured workout plans
- follow workout days
- start workout sessions
- track exercises (sets/reps/weight)
- track cardio
- view progress (recent performance)

Backend is built with Django (Django REST Framework style APIs).
Frontend is built using **vanilla JavaScript + HTML + CSS** (NO React).

---

## ⚙️ Architecture

### Backend
- Django + DRF-style API views
- Session-based authentication (NOT JWT)
- Database-driven workout system

### Frontend
- Vanilla JS (DOM manipulation)
- Fetch API for backend communication
- No framework (no React, no state library)

---

## 🧱 Core Data Model

### Entities

- User
- WorkoutPlan (1 per user, active)
- WorkoutDay (belongs to plan)
- PlannedExercise (belongs to day)
- PlannedCardio (belongs to day)
- WorkoutSession (runtime session)
- SetProgress (tracks sets per session)
- CardioProgress (tracks cardio per session)

---

## 🔄 Core System Design

### IMPORTANT CONCEPTS

- WorkoutPlan & WorkoutDay are **static templates**
- WorkoutSession is a **runtime instance**
- Progress is recorded via:
  - SetProgress
  - CardioProgress

❗ NEVER duplicate workout days per week  
❗ NEVER regenerate plans after completion  
❗ Sessions represent history, not structure  

---

## 🔐 Authentication

- Session-based authentication (Django default)
- Frontend does NOT manage tokens
- Cookies are used automatically

---

## 🔌 Key API Endpoints

### Session
- POST `/start_session/`
- PUT `/end_session/`
- GET `/active_session/` (custom)

### Tracking
- POST `/track_set/`
- POST `/track_cardio/`

### Exercises
- GET `/get_all_exercises/`
- POST `/add_exercise/`
- DELETE `/delete_exercise/<id>/`

### Cardio
- POST `/add_cardio/`
- DELETE `/delete_cardio/<id>/`

### Progress
- (custom) last sets per exercise
- (custom) last cardio per exercise

---

## 🧠 Frontend State Model

Global state object:

```js
const appState = {
  activeSession: null,
  selectedDay: null,
  sessionProgress: {},
};
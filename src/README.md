# Mergington High School Activities API

A super simple FastAPI application that allows students to view extracurricular activities. Signing a student up or removing them from an activity requires a teacher to be logged in.

## Features

- View all available extracurricular activities (students, no login required)
- Teacher login/logout
- Sign up or unregister a student for an activity (teachers only)

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## Teacher Login

Teacher accounts are pre-assigned and stored (as salted-free sha256 password hashes) in [`teachers.json`](./teachers.json); there is no self-service account creation. For local testing, two demo accounts are included:

| Username        | Password            |
| --------------- | -------------------- |
| `ms.rodriguez`  | `chess-rocks-2026`   |
| `principal.lee` | `mergington-lions`   |

Click the 👤 icon in the top-right corner of the page to log in. Replace these demo credentials with real teacher accounts before deploying this app anywhere real students or teachers will use it.

## API Endpoints

| Method | Endpoint                                                          | Auth required | Description                                                         |
| ------ | ----------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| GET    | `/activities`                                                     | No             | Get all activities with their details and current participant count |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Teacher        | Sign up a student for an activity                                    |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Teacher    | Unregister a student from an activity                                |
| POST   | `/auth/login`                                                     | No             | Log in with `{"username": ..., "password": ...}`, returns a session token |
| POST   | `/auth/logout`                                                    | Teacher        | Invalidate the current session token                                 |

Teacher-only endpoints require an `Authorization: Bearer <token>` header with the token returned by `/auth/login`.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data (activities, sign-ups, and teacher sessions) will be reset when the server restarts.


# HabitLoop - Phone Number Registration, Login & Daily Routine Tracking System

HabitLoop is a daily routine checklist application built with a FastAPI backend, a React frontend, MongoDB for persistence, Redis for caching, and Twilio for phone-call verification (OTP) and scheduled routine reminder calls.

---

## 1. Database Collections

### Collection: `user`
Stores registered user profile data.

| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `phone` | String | Unique phone number in E.164 format |
| `name` | String | Display name of the user |
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Record modification timestamp |

### Collection: `routine`
Stores daily routine template patterns.

| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `userId` | String (UUID) | Reference to the owner User ID |
| `title` | String | Label of the routine |
| `time` | String | Scheduled time in 24h format (HH:MM) |
| `isActive` | Boolean | Soft delete status flag |
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Record modification timestamp |

### Collection: `daily_routine_track`
Tracks checklist logs for individual days.

| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `userId` | String (UUID) | Reference to the owner User ID |
| `routineId` | String (UUID) | Reference to the template Routine ID |
| `date` | String | Target date in YYYY-MM-DD format |
| `title` | String | Copied label of the routine |
| `time` | String | Scheduled time (HH:MM) |
| `status` | String | Status: `Pending`, `Completed`, `Will Complete Later` |
| `statusUpdatedAt` | Date | Timestamp of the last status change |
| `reminderCalled` | Boolean | Whether Twilio outbound call was initiated |
| `reminderResponse` | String | User pressed DTMF code (`"0"`, `"1"`, `"2"`) or `null` |
| `reminderResponseAt` | Date | Timestamp of the DTMF keypad response |
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Record modification timestamp |

---

## 2. API Documentation

### Authentication Endpoints

#### `POST` `/api/auth/register/start`
Starts phone verification for registration.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "digit": 5 } }
  ```
* **Status**: `200 OK` (starts Twilio call) / `400 Bad Request` (already registered / invalid phone)

#### `POST` `/api/auth/register/complete`
Creates the user after call verification succeeds.
* **Request**:
  ```json
  { "phone": "+919876543210", "name": "Deepak" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "token": "session-uuid", "user": { "id": "uuid", "phone": "+919876543210", "name": "Deepak" } } }
  ```

#### `POST` `/api/auth/login/start`
Starts verification for logging in.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "digit": 7 } }
  ```

#### `POST` `/api/auth/login/complete`
Logs the user in after call verification succeeds.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "token": "session-uuid", "user": { "id": "uuid", "phone": "+919876543210", "name": "Deepak" } } }
  ```

#### `GET` `/api/auth/status`
Checks if phone number is verified (polled by the UI).
* **Parameters**: `phone=+919876543210`, `mode=register` (or `login`)
* **Response**:
  ```json
  { "success": true, "data": { "verified": true } }
  ```

---

### Routine Template Endpoints

#### `GET` `/api/routines`
Gets active routine templates.
* **Headers**: `Authorization: Bearer <session-token>`
* **Response**:
  ```json
  { "success": true, "data": [{ "id": "uuid", "title": "Yoga", "time": "07:00", "isActive": true }] }
  ```

#### `POST` `/api/routines`
Creates a routine template pattern.
* **Headers**: `Authorization: Bearer <session-token>`
* **Request**:
  ```json
  { "title": "Read Paper", "time": "08:30" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "id": "uuid", "title": "Read Paper", "time": "08:30", "isActive": true } }
  ```

#### `PUT` `/api/routines/{id}`
Updates a routine template.
* **Headers**: `Authorization: Bearer <session-token>`
* **Request**:
  ```json
  { "title": "Read Paper Longer", "time": "09:00", "isActive": true }
  ```
* **Response**:
  ```json
  { "success": true }
  ```

#### `DELETE` `/api/routines/{id}`
Soft-deletes a routine template.
* **Headers**: `Authorization: Bearer <session-token>`
* **Response**:
  ```json
  { "success": true, "message": "Routine template soft-deleted successfully" }
  ```

---

### Routine Tracking Checklist Endpoints

#### `GET` `/api/tracker/today`
Gets checklist for a target local date. If empty, creates tracks from templates.
* **Headers**: `Authorization: Bearer <session-token>`
* **Parameters**: `date=YYYY-MM-DD`
* **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "track-uuid",
        "routineId": "template-uuid",
        "date": "2026-07-28",
        "title": "Yoga",
        "time": "07:00",
        "status": "Pending",
        "statusUpdatedAt": "2026-07-28T13:00:00Z",
        "reminderCalled": false,
        "reminderResponse": null,
        "reminderResponseAt": null,
        "isMissed": true
      }
    ]
  }
  ```

#### `PATCH` `/api/tracker/{id}/status`
Marks item as Completed, Pending, or Will Complete Later.
* **Headers**: `Authorization: Bearer <session-token>`
* **Request**:
  ```json
  { "status": "Completed" }
  ```
* **Response**:
  ```json
  { "success": true }
  ```

#### `GET` `/api/tracker/history`
Gets historical lists grouped by date (excludes today).
* **Headers**: `Authorization: Bearer <session-token>`
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "2026-07-27": [
        { "id": "track-uuid", "routineId": "template-uuid", "title": "Gym", "time": "18:00", "status": "Completed", "isMissed": false }
      ]
    }
  }
  ```

---

### Twilio Webhooks

#### `POST` `/api/webhooks/twilio/verification-call`
TwiML endpoint answering outbound verification call. Gathers DTMF digit input.
* **Parameters**: `phone=+919876543210`
* **Response**: XML TwiML gather response.

#### `POST` `/api/webhooks/twilio/verify-digit`
TwiML callback checking if DTMF digit matches Redis OTP cache.
* **Form Parameters**: `Digits=5`
* **Response**: XML TwiML hangup.

#### `POST` `/api/webhooks/twilio/reminder-call`
TwiML webhook answering outbound reminder call. Gathers DTMF code (1, 0, or 2).
* **Parameters**: `trackId=track-uuid`
* **Response**: XML TwiML gather response.

#### `POST` `/api/webhooks/twilio/verify-reminder`
TwiML callback handling DTMF keypress for status update (1 -> Completed, 0 -> Pending, 2 -> Later).
* **Form Parameters**: `Digits=1`
* **Response**: XML TwiML hangup.

---

## 3. Installation & Run Guide

### Step 1: Set Environment Variables
Open the `.env` file at the root of the project and populate your Twilio credentials and timezone:
```env
# Twilio Credentials (leave blank to run in MOCK calling mode)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Timezone (checks local schedules based on this timezone)
TIMEZONE=Asia/Kolkata

# Public exposed address (e.g. ngrok tunnel)
PUBLIC_URL=https://xxxx.ngrok-free.app
```

### Step 2: Run via Docker Compose
Build and run the entire stack:
```bash
docker-compose up --build
```
This starts:
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- FastAPI Backend: `http://localhost:8000`
- React Frontend (Vite): `http://localhost:3000` (proxied via Nginx)
- Nginx Gateway: `http://localhost:3000`

### Step 3: Connect public URL using ngrok
To let Twilio connect to your local webhooks, run ngrok on port 3000:
```bash
ngrok http 3000
```
Then copy your ngrok URL (e.g., `https://xxxx.ngrok-free.app`) and paste it as `PUBLIC_URL` in your `.env` file, and restart the backend container or compose.

# 📅 Routine Tracker with Twilio Integrations

A complete Phone Number Registration, Login, and Daily Routine Tracking System featuring voice-call authentication and automated daily phone reminders with keypad (DTMF) check-ins.

---

## 🏗️ Tech Stack

- **Backend**: Python (FastAPI), Uvicorn
- **Frontend**: React (Vite, custom CSS with Outfit/Inter modern typography and dark glassmorphism)
- **Databases**: 
  - **MongoDB**: Storage for User, Routine, and Log (singular collections, UUID string keys, `createdAt` and `updatedAt` fields).
  - **Redis**: Rate limiting, JWT session caching, and temporary auth OTP digits.
- **Third-Party**: **Twilio Voice API** (DTMF gather webhooks and call timers).

---

## 🗄️ Database Schema Design

The application uses three singular collections in MongoDB. All keys are UUIDv4 strings.

### 1. `user` Collection
Stores registered user records.
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `name` | String | User's full name |
| `phone` | String | E.164 phone number (unique) |
| `createdAt` | DateTime | Timestamp of registration |
| `updatedAt` | DateTime | Timestamp of last modification |

### 2. `routine` Collection
Stores routine habits and schedule definitions.
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `userId` | String (UUID) | Reference to `user.id` |
| `title` | String | Routine label (e.g. "Exercise") |
| `description` | String | Routine details |
| `time` | String | Reminder time in 24h format (`HH:MM`) |
| `createdAt` | DateTime | Timestamp of creation |
| `updatedAt` | DateTime | Timestamp of last modification |

### 3. `log` Collection
Stores routine completions, skipped states, and reminder logs.
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `routineId` | String (UUID) | Reference to `routine.id` |
| `userId` | String (UUID) | Reference to `user.id` |
| `date` | String | Date of log (`YYYY-MM-DD`) |
| `status` | String | Completion state (`completed`, `pending`, `later`) |
| `timestamp` | DateTime | Keypad submission timestamp |
| `createdAt` | DateTime | Timestamp of entry |
| `updatedAt` | DateTime | Timestamp of entry modification |

---

## 🔌 API Documentation

All API responses wrap objects in:
```json
{
  "success": true,
  "data": { ... }
}
```

### 🔐 Authentication APIs

#### 1. Initiate Registration
- **Endpoint**: `/api/auth/register`
- **Method**: `POST`
- **Purpose**: Checks phone number uniqueness, generates verification digit (1-9), caches in Redis, and initiates verification call.
- **Request**:
  ```json
  { "phone": "+14632704532" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "verificationPending": true, "digit": 5 } }
  ```

#### 2. Initiate Login
- **Endpoint**: `/api/auth/login`
- **Method**: `POST`
- **Purpose**: Confirms user exists, generates OTP digit, caches, and rings phone.
- **Request**:
  ```json
  { "phone": "+14632704532" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "verificationPending": true, "digit": 7 } }
  ```

#### 3. Poll Verification Status
- **Endpoint**: `/api/auth/verify?phone=+14632704532`
- **Method**: `GET`
- **Purpose**: Polled by client. Detects if DTMF call webhook has registered correct keypress. Returns JWT on success.
- **Response**:
  ```json
  { "success": true, "data": { "verified": true, "registered": true, "token": "JWT_HEADER", "user": { "id": "UUID", "name": "John Doe" } } }
  ```

#### 4. Complete Registration
- **Endpoint**: `/api/auth/complete-registration`
- **Method**: `POST`
- **Purpose**: Submits user name, validates Redis registration token, inserts user in DB, and issues session JWT.
- **Request**:
  ```json
  { "phone": "+14632704532", "name": "John Doe" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "token": "JWT_TOKEN", "user": { "id": "UUID", "name": "John Doe" } } }
  ```

---

### 📅 Routine Checklist & Dashboard APIs

#### 5. Get My Routines
- **Endpoint**: `/api/routines`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  { "success": true, "data": [ { "id": "UUID", "title": "Meditation", "time": "07:30" } ] }
  ```

#### 6. Add New Routine
- **Endpoint**: `/api/routines`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request**:
  ```json
  { "title": "Gym Workout", "description": "Lifting", "time": "18:00" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "id": "UUID", "title": "Gym Workout" } }
  ```

#### 7. Update Routine
- **Endpoint**: `/api/routines/{id}`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <token>`
- **Request**:
  ```json
  { "title": "Walking", "description": "Nature hike", "time": "07:00" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "id": "UUID", "title": "Walking" } }
  ```

#### 8. Delete Routine
- **Endpoint**: `/api/routines/{id}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  { "success": true, "data": { "id": "UUID", "message": "Routine deleted successfully" } }
  ```

#### 9. Get Today's Dashboard Checklist
- **Endpoint**: `/api/dashboard?date=YYYY-MM-DD&time=HH:MM`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Purpose**: Generates dynamic log checklist. Flagged is `true` if scheduled time has passed and item is still pending.
- **Response**:
  ```json
  { "success": true, "data": [ { "routineId": "UUID", "title": "Water Intake", "time": "08:30", "status": "pending", "flagged": true } ] }
  ```

#### 10. Manual Log Completion
- **Endpoint**: `/api/dashboard/complete`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request**:
  ```json
  { "routineId": "UUID", "date": "2026-07-28", "status": "completed" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "routineId": "UUID", "status": "completed" } }
  ```

#### 11. Historical Log Stats
- **Endpoint**: `/api/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  { "success": true, "data": [ { "logId": "UUID", "title": "Walk", "date": "2026-07-27", "status": "completed" } ] }
  ```

---

## 🛠️ Installation & Execution

### Prerequisites
Make sure local **MongoDB** (port `27017`) and **Redis** (port `6379`) are running.

### 1. Unified Startup
From the root folder, run:
```bash
npm install
npm run dev
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URL=mongodb://admin:password123@localhost:27017/routine_tracker_db?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
TWIML_WEBHOOK_URL=https://your_ngrok_subdomain.ngrok-free.dev
```

### 3. Twilio Webhook setup
Point Twilio numbers to the ngrok public address:
- **Voice Request URL**: `https://<ngrok_url>/api/twilio/voice/auth` or dynamic reminder endpoints.

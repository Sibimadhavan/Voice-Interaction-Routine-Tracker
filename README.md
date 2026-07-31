# HabitLoop - Simplified Phone Authentication & Verification System

HabitLoop is a secure passwordless registration and login application built with a FastAPI backend, React frontend, MongoDB for persistence, Redis for verification state caching/sessions, and Twilio for voice-call challenge OTP verification.

All routine tracking and scheduler tasks have been disabled to focus purely on secure phone-call verification, welcoming authenticated users with a custom dashboard.

---

## 1. Database Collections & Schemas

### MongoDB Collection: `user`
Stores registered user profile data.

| Field | Type | Description |
|---|---|---|
| `id` | String (UUID v4) | Primary Key |
| `phone` | String | Unique phone number in E.164 format |
| `name` | String | Display name of the user |
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Record modification timestamp |

---

### Redis Cache Keys

#### Voice OTP Code
* **Key**: `otp:<phone_number>`
* **Value**: Generated single digit challenge code (`1-9`)
* **TTL**: 300 seconds (5 minutes)

#### Verification Success Markers
* **Key**: `verified_registration:<phone_number>` or `verified_login:<phone_number>`
* **Value**: `"true"`
* **TTL**: 600 seconds (10 minutes)

#### Session Tokens
* **Key**: `session:<session_token_uuid>`
* **Value**: Owner `userId` (MongoDB User UUID)
* **TTL**: 86400 seconds (24 hours)

---

## 2. API Endpoints

### Authentication Endpoints

#### `POST` `/api/auth/register/start`
Starts voice verification for a new user registration.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "digit": 5 } }
  ```
* **Status**: `200 OK` (triggers Twilio call) / `400 Bad Request` (phone already registered / invalid format)

#### `POST` `/api/auth/register/complete`
Saves user profile into MongoDB after successful call verification.
* **Request**:
  ```json
  { "phone": "+919876543210", "name": "Deepak" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "token": "session-uuid", "user": { "id": "uuid", "phone": "+919876543210", "name": "Deepak" } } }
  ```

#### `POST` `/api/auth/login/start`
Starts verification challenge for an existing registered user.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "digit": 7 } }
  ```

#### `POST` `/api/auth/login/complete`
Authenticates user and returns session token after successful verification.
* **Request**:
  ```json
  { "phone": "+919876543210" }
  ```
* **Response**:
  ```json
  { "success": true, "data": { "token": "session-uuid", "user": { "id": "uuid", "phone": "+919876543210", "name": "Deepak" } } }
  ```

#### `GET` `/api/auth/status`
Checks if the verification status for a number is confirmed (polled by the React UI).
* **Parameters**: `phone=+919876543210`, `mode=register` (or `login`)
* **Response**:
  ```json
  { "success": true, "data": { "verified": true } }
  ```

#### `POST` `/api/auth/logout-user`
Deletes user session from Redis.
* **Headers**: `Authorization: Bearer <session-token>`
* **Response**:
  ```json
  { "success": true }
  ```

---

### Twilio Webhooks

#### `POST` `/api/webhooks/twilio/verification-call`
TwiML endpoint that answers the outbound call. Instructs Twilio to speak the challenge and gather the keypad entry.
* **Parameters**: `phone=+919876543210`
* **Response**: XML TwiML gather response.

#### `POST` `/api/webhooks/twilio/verify-digit`
TwiML callback that verifies if the user-pressed keypad DTMF key matches the Redis cached OTP.
* **Form Parameters**: `Digits=5`
* **Response**: XML TwiML hangup.

---

## 3. Setup and Run Guide

### Step 1: Set Environment Variables
Create a `.env` file in the project root:
```env
# Twilio Credentials (leave blank to run in MOCK calling mode)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Public exposed address (e.g. ngrok tunnel URL)
PUBLIC_URL=https://xxxx.ngrok-free.app
```

### Step 2: Start Container Stack
```bash
docker compose up --build
```
This deploys:
* MongoDB: `mongodb://localhost:27017`
* Redis: `redis://localhost:6379`
* Backend API: `http://localhost:8000`
* Frontend App: `http://localhost:3000` (proxied via Nginx gateway)

### Step 3: Run ngrok for webhooks
To route Twilio webhooks to your local server:
```bash
ngrok http 3000
```
Update the `PUBLIC_URL` variable in `.env` with the ngrok URL and restart the containers.

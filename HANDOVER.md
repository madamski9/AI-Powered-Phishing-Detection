# Setup Guide — AI-Powered Phishing Detection

This document lists every file and credential needed to run the full stack
(Docker backend + React Native mobile app) from scratch.

---

## Files you need to receive (via secure channel)

| File | Where to place it | Description |
|---|---|---|
| `firebase_phishing_key.json` | `api/` | Firebase Admin SDK service account key |
| `.env` | `api/` | API service environment variables |
| `.env` | `mobile/` | Mobile app environment variables |

---

## Step 1 — Firebase Admin SDK key (backend)

1. Place the received `firebase_phishing_key.json` file inside:
   ```
   api/firebase_phishing_key.json
   ```

2. Open `api/.env` and make sure `FIREBASE_KEY_PATH` matches the filename:
   ```env
   FIREBASE_KEY_PATH=firebase_phishing_key.json
   ```

---

## Step 2 — API environment (`api/.env`)

Create `api/.env` (or use the received file) based on `api/.env.example`:

```env
# Path to the Firebase Admin SDK key (relative to the api/ directory)
FIREBASE_KEY_PATH=firebase_phishing_key.json

# Firebase project number — Firebase Console → Project settings → Project number
FIREBASE_CLIENT_ID=<project-number>

# ML service URL — leave as-is for Docker Compose
ML_SERVICE_URL=http://ml-service:8000
```

---

## Step 3 — Mobile environment (`mobile/.env`)

Create `mobile/.env` (or use the received file) based on `mobile/.env.example`:

```env
# Google OAuth — Google Cloud Console → APIs & Services → Credentials
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET=<web-client-secret>

# API URL — set to your machine's LAN IP for local dev, or server URL for production
EXPO_PUBLIC_API_URL=http://<your-ip>:8080

# Google APIs (these values are fixed, no changes needed)
EXPO_PUBLIC_GMAIL_API_BASE=https://gmail.googleapis.com/gmail/v1/users/me
EXPO_PUBLIC_GOOGLE_TOKENINFO_URL=https://www.googleapis.com/oauth2/v3/tokeninfo

# Firebase — Firebase Console → Project settings → General → Your apps → Config
EXPO_PUBLIC_FIREBASE_API_KEY=<api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<app-id>
EXPO_PUBLIC_MEASUREMENT_ID=<measurement-id>
```

> **`EXPO_PUBLIC_API_URL`** — for local development this must be your machine's
> **LAN IP address** (not `localhost`), because the mobile device/emulator runs
> on a separate network stack. Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
> to find your IP.

---

## Step 4 — Start the backend (Docker)

```bash
# From the project root
docker compose up --build
```

The API will be available at `http://localhost:8080` and
the ML service at `http://localhost:8000`.

Health check:
```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
```

---

## Step 5 — Start the mobile app

```bash
cd mobile
npm install

# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

Or use the quick-start script from the project root:
```bash
./run.sh ios
./run.sh android
```

---

## Where each credential comes from

| Credential | Where to get it |
|---|---|
| Firebase Admin SDK JSON | Firebase Console → Project settings → Service accounts → Generate new private key |
| `FIREBASE_CLIENT_ID` | Firebase Console → Project settings → General → Project number |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → General → Your apps → Web app config |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 → Web client |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 → iOS client |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET` | Same as Web client above |

---

## Project structure (quick reference)

```
project/
├── api/
│   ├── .env                  ← backend secrets (not in git)
│   ├── .env.example          ← template
│   └── app/
│            ← place the JSON key here (not in git)
├── ml-service/               ← no secrets needed, loaded via api/.env
├── mobile/
│   ├── .env                  ← mobile secrets (not in git)
│   └── .env.example          ← template
├── docker-compose.yml
└── HANDOVER.md               ← this file
```
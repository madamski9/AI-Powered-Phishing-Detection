# Setup Guide — AI-Powered Phishing Detection

This document covers everything needed to run the full stack from scratch:
Docker backend (API + ML service) and React Native mobile app.

---

## Step 0 — Download ML models

The pre-trained models are not stored in the repository. Download them from Google Drive:

**[Download models (Google Drive)](https://drive.google.com/drive/folders/1f4ruHcsBTUZ70GqOdjsoc5lk9zCyU8ki?usp=share_link)**

Place each file in the correct location:

| File | Destination |
|---|---|
| `email_phishing_detector.joblib` | `ml-service/src/email_model/models/` |
| `phishing_detector.joblib` | `ml-service/src/url_model/models/` |

Without these files the ML service will crash on startup.

---

## Step 1 — Create a Firebase project

This project requires your own Firebase project for authentication.

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Enable **Authentication** → Sign-in method → turn on **Email/Password** and **Google**

---

## Step 2 — Firebase Admin SDK key (`api/.env`)

The API uses the Firebase Admin SDK to verify tokens. You need a service account key.

1. In Firebase Console → **Project settings** (gear icon) → **Service accounts** tab
2. Click **Generate new private key** → **Generate key**
3. A `.json` file is downloaded — place it inside `api/`:
   ```
   api/firebase_key.json
   ```
4. Create `api/.env`:
   ```bash
   cp api/.env.example api/.env
   ```
5. Set `FIREBASE_KEY_PATH` to the filename of the JSON you just placed:
   ```env
   FIREBASE_KEY_PATH=firebase_key.json
   ```

Full `api/.env` reference:

```env
# Path to Firebase Admin SDK key (relative to api/ directory)
FIREBASE_KEY_PATH=firebase_key.json

# Firebase project number — Firebase Console → Project settings → General → Project number
FIREBASE_CLIENT_ID=<project-number>

# ML service URL — leave as-is for Docker Compose
ML_SERVICE_URL=http://ml-service:8000
```

---

## Step 3 — Mobile environment (`mobile/.env`)

The mobile app needs Firebase web app config keys and Google OAuth credentials.

### 3a — Firebase web app keys

1. In Firebase Console → **Project settings** → **General** tab
2. Scroll to **Your apps** → click **Add app** → choose **Web** (`</>`)
3. Register the app (name doesn't matter), copy the config object

### 3b — Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create an **OAuth 2.0 Client ID** for **Web application** → copy Client ID and Client Secret
3. Create another **OAuth 2.0 Client ID** for **iOS** → copy Client ID

### 3c — Fill in `mobile/.env`

```bash
cp mobile/.env.example mobile/.env
```

```env
# Google OAuth — from Google Cloud Console
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET=<web-client-secret>

# API URL — use your machine's LAN IP for local dev (not localhost)
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8080

# Google APIs (fixed values, no changes needed)
EXPO_PUBLIC_GMAIL_API_BASE=https://gmail.googleapis.com/gmail/v1/users/me
EXPO_PUBLIC_GOOGLE_TOKENINFO_URL=https://www.googleapis.com/oauth2/v3/tokeninfo

# Firebase — from Firebase Console → Project settings → Your apps → Web app config
EXPO_PUBLIC_FIREBASE_API_KEY=<api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<app-id>
EXPO_PUBLIC_MEASUREMENT_ID=<measurement-id>
```

> **`EXPO_PUBLIC_API_URL`** — for local development this must be your machine's LAN IP
> (not `localhost`), because the mobile device/emulator runs on a separate network stack.
> Run `ifconfig` (Mac/Linux) or `ipconfig` (Windows) to find it.

---

## Step 4 — Start the backend

```bash
# From the project root
docker compose up --build
```

The API will be available at `http://localhost:8080` and the ML service at `http://localhost:8000`.

> The ML service loads models on startup — it can take up to 90 seconds to become healthy.
> The API waits for it automatically.

Health check:
```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
```

---

## Step 5 — Start the mobile app

```bash
./run.sh ios      # iOS
./run.sh android  # Android
./run.sh web      # Web
```

Or manually:
```bash
cd mobile && npm install
npx react-native run-ios      # iOS
npx react-native run-android  # Android
```

---

## Credentials reference

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
│   ├── firebase_key.json     ← place your service account key here
│   ├── .env                  ← api secrets (FIREBASE_KEY_PATH, etc.)
│   └── .env.example          ← template
├── ml-service/
│   └── src/
│       ├── email_model/models/   ← place email_phishing_detector.joblib here
│       └── url_model/models/     ← place phishing_detector.joblib here
├── mobile/
│   ├── .env                  ← mobile secrets
│   └── .env.example          ← template
├── docker-compose.yml
└── HANDOVER.md               ← this file
```

<div align="center">

# AI-Powered Phishing Detection

### Mobile phishing detector for URLs and emails, powered by machine learning.

</div>

---

## Tech Stack

<div align="center">

| Area | Technology |
|:---:|:---:|
| Mobile application | <img height="40" src="https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"><img height="40" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"><img height="40" src="https://img.shields.io/badge/StyleSheet-61DAFB?style=for-the-badge&logo=react&logoColor=20232A"> |
| Backend API | <img height="40" src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"><img height="40" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"><img height="40" src="https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white"> |
| Machine Learning | <img height="40" src="https://img.shields.io/badge/XGBoost-EB6C2D?style=for-the-badge"><img height="40" src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white"><img height="40" src="https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white"><img height="40" src="https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white"> |
| Authentication & Integrations | <img height="40" src="https://img.shields.io/badge/Google%20OAuth%202.0-4285F4?style=for-the-badge&logo=google&logoColor=white"><img height="40" src="https://img.shields.io/badge/Gmail%20API-EA4335?style=for-the-badge&logo=gmail&logoColor=white"><img height="40" src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black"> |
| DevOps & Infrastructure | <img height="40" src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"><img height="40" src="https://img.shields.io/badge/Shell-121011?style=for-the-badge&logo=gnu-bash&logoColor=white"> |

</div>

---

## Overview

**AI-Powered Phishing Detection** is a mobile application that helps users identify phishing attempts in real time. The system analyzes suspicious URLs and emails using a machine-learning model trained on phishing indicators, returning a clear verdict to the user within seconds.

The project is built with a contenerization architecture: a React Native mobile client communicates with a FastAPI backend, which delegates classification to a dedicated ML inference service. The whole stack is containerized with Docker and orchestrated via Docker Compose.

**Firebase** is integrated into the mobile application to support authentication flows and native service configuration on Android and iOS.

## Features

- **URL phishing detection** — paste or scan any URL and receive an instant risk assessment.
- **Email phishing detection** — sign in with Google and scan your latest emails directly from the app.
- **Google OAuth integration** — secure sign-in with Gmail API access for email scanning.
- **ML-powered classification** — XGBoost model trained on a curated dataset of phishing and legitimate samples.
- **Modern mobile UI** — built with React Native and TypeScript for a fast, native feel on both iOS and Android.
- **Containerized deployment** — spin up the entire stack with a single `docker-compose up`.

## Screenshots
<div align="center">

| App entry | Home screen | Email scanner | URL scanner |
|-----------|-------------|----------------|--------------|
| <img alt="IMG_7201" src="https://github.com/user-attachments/assets/d0313b54-f367-4f6f-a33f-0226d4a4c72e" width="250"/> | <img alt="IMG_7198" src="https://github.com/user-attachments/assets/ef5e7998-e60d-426f-97da-6469e3c1b6e2" width="250"/> | <img alt="IMG_7197" src="https://github.com/user-attachments/assets/12231044-e263-4df7-8256-12417d731e86" width="250"/> | <img alt="IMG_7202" src="https://github.com/user-attachments/assets/5eb36a0e-6cff-4ab6-a750-24ef881bcc80" width="250"/> |

</div>

## Machine Learning

The ML service contains two independent XGBoost classifiers with full documentation,
evaluation plots, and training pipelines.

→ **[ml-service/README.md](./ml-service/README.md)** — feature engineering, model architecture, results, and evaluation plots for both models.

| Model | F1 | ROC-AUC |
|---|---|---|
| URL phishing detector | 0.8867 | 0.9860 |
| Email phishing detector | 0.9845 | 0.9987 |

> **Note:** these metrics are measured on a held-out split of the same static datasets used for training and should be treated as optimistic estimates. Real-world performance will be lower due to dataset bias, distribution shift over time, and the absence of adversarial evaluation. See the [ML service README](./ml-service/README.md#️-limitations--why-the-reported-metrics-are-optimistic) for a detailed discussion and a roadmap for future improvements.

## Project Structure

```
AI-Powered-Phishing-Detection/
├── api/                  # FastAPI backend service
├── ml-service/           # XGBoost inference microservice + ML docs
│   └── README.md         # ← ML model documentation
├── mobile/               # React Native mobile app (TypeScript)
├── scripts/              # Build & utility shell scripts
├── docker-compose.yml    # Orchestrates all services
├── DOCKER_README.md      # Docker-specific setup notes
├── HANDOVER.md           # ← Step-by-step setup guide for new developers
└── run.sh                # Quick-start launcher
```

## Handover / Setup Guide

If you're setting up this project for the first time (new team, new machine), see:

→ **[HANDOVER.md](./HANDOVER.md)** — covers ML model download, environment variables, Firebase credentials, and how to get the full stack running.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (LTS) and npm/yarn — for the mobile client
- [React Native CLI environment](https://reactnative.dev/docs/environment-setup) (Xcode for iOS, Android Studio for Android)
- A Google Cloud project with OAuth 2.0 credentials (for email scanning)

### 1. Clone the repository

```bash
git clone https://github.com/madamski9/AI-Powered-Phishing-Detection.git
cd AI-Powered-Phishing-Detection
```

### 2. Run the app

```bash
./run.sh ios || ./run.sh android
```

### …or manually:

```bash
docker-compose up --build
```

This launches the FastAPI API and the ML inference service. See [`DOCKER_README.md`](./DOCKER_README.md) for details.

```bash
cd mobile
npm install

# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

### 3. Configure environment variables

Create `.env` files in `api/` and `mobile/` with the appropriate keys (Google OAuth client ID/secret, API base URL, etc.). See each subdirectory's documentation for the required variables.

## How It Works

1. The user submits a URL — or, after signing in with Google, requests an email scan — through the mobile app.
2. The mobile client calls the FastAPI backend, which extracts features from the input.
3. The backend forwards the feature vector to the ML service, which runs inference using the trained XGBoost model.
4. The verdict (safe / suspicious / phishing) and a confidence score are returned to the user.


## Author

**Maciek Adamski** — [@madamski9](https://github.com/madamski9)

## License

This project is currently developed as part of an internship project at Seargin. License terms TBD.

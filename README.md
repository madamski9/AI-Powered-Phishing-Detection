<div align="center">

# AI-Powered Phishing Detection

### Mobile phishing detector for URLs and emails, powered by machine learning.

</div>

---

## Tech Stack

<div align="center">

#### Mobile

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![StyleSheet](https://img.shields.io/badge/StyleSheet-61DAFB?style=for-the-badge&logo=react&logoColor=20232A)

#### Backend

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)

#### Machine Learning

![XGBoost](https://img.shields.io/badge/XGBoost-EB6C2D?style=for-the-badge&logo=xgboost&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)
![pandas](https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)

#### DevOps

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Shell](https://img.shields.io/badge/Shell-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

#### Auth & Integrations

![Google OAuth](https://img.shields.io/badge/Google_OAuth_2.0-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Gmail API](https://img.shields.io/badge/Gmail_API-EA4335?style=for-the-badge&logo=gmail&logoColor=white)

</div>

---

## Overview

**AI-Powered Phishing Detection** is a mobile application that helps users identify phishing attempts in real time. The system analyzes suspicious URLs and emails using a machine-learning model trained on phishing indicators, returning a clear verdict to the user within seconds.

The project is built with a contenerization architecture: a React Native mobile client communicates with a FastAPI backend, which delegates classification to a dedicated ML inference service. The whole stack is containerized with Docker and orchestrated via Docker Compose.

## Features

- **URL phishing detection** — paste or scan any URL and receive an instant risk assessment.
- **Email phishing detection** — sign in with Google and scan your latest emails directly from the app.
- **Google OAuth integration** — secure sign-in with Gmail API access for email scanning.
- **ML-powered classification** — XGBoost model trained on a curated dataset of phishing and legitimate samples.
- **Modern mobile UI** — built with React Native and TypeScript for a fast, native feel on both iOS and Android.
- **Containerized deployment** — spin up the entire stack with a single `docker-compose up`.

## Project Structure

```
AI-Powered-Phishing-Detection-Seargin/
├── api/                  # FastAPI backend service
├── ml-service/           # XGBoost inference microservice
├── mobile/               # React Native mobile app (TypeScript)
├── scripts/              # Build & utility shell scripts
├── docker-compose.yml    # Orchestrates all services
├── DOCKER_README.md      # Docker-specific setup notes
└── run.sh                # Quick-start launcher
```

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (LTS) and npm/yarn — for the mobile client
- [React Native CLI environment](https://reactnative.dev/docs/environment-setup) (Xcode for iOS, Android Studio for Android)
- A Google Cloud project with OAuth 2.0 credentials (for email scanning)

### 1. Clone the repository

```bash
git clone https://github.com/madamski9/AI-Powered-Phishing-Detection-Seargin.git
cd AI-Powered-Phishing-Detection-Seargin
```

### 2. Run the app

```bash
./run.sh
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

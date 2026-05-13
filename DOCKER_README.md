# Seargin Cybersecurity - Docker & Scripts Documentation

> **First time setup?** See [HANDOVER.md](HANDOVER.md) for Firebase config, `.env` files, and ML model download.

---

## QUICKSTART (One Command!)

```bash
./run.sh ios      # iOS
./run.sh android  # Android
./run.sh web      # Web
```

This single command will:
- Start ML service (Docker)
- Start API service (Docker, waits for ML service to be healthy)
- Install mobile dependencies (if needed)
- Wait for API to be ready
- Launch your chosen mobile platform

---

## Project Structure

```
seargin_cybersecurity/
├── api/                          # FastAPI backend
│   ├── Dockerfile                # Python 3.11 multi-stage build
│   ├── requirements.txt
│   ├── .env.example              # Environment template
│   └── main.py
│
├── ml-service/                   # ML inference service (FastAPI, port 8000)
│   ├── Dockerfile                # Python 3.11 multi-stage build
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   └── predictor.py
│   └── src/
│       ├── email_model/          # Trained email phishing model
│       └── url_model/            # Trained URL phishing model
│
├── mobile/                       # React Native / Expo frontend
│   ├── package.json
│   └── .env.example              # Environment template
│
├── scripts/
│   ├── setup-mobile.sh
│   └── run-mobile.sh
│
├── docker-compose.yml            # API + ML service
├── run.sh                        # ONE COMMAND START ALL
└── DOCKER_README.md             # This file
```

---

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for mobile development)
- Xcode (for iOS) / Android SDK (for Android)

---

## Mobile App

### With run.sh (Automatic)
```bash
./run.sh          # Interactive platform selection
./run.sh ios
./run.sh android
./run.sh web
```

### Manual
```bash
./scripts/setup-mobile.sh        # Install dependencies

./scripts/run-mobile.sh ios
./scripts/run-mobile.sh android
./scripts/run-mobile.sh web
./scripts/run-mobile.sh start    # Expo dev server only
```

---

## Docker Compose

### Start all services
```bash
docker compose up -d
```

### View logs
```bash
docker compose logs -f            # All services
docker compose logs -f api
docker compose logs -f ml-service
```

### Stop
```bash
docker compose down
```

### Rebuild
```bash
docker compose build              # All
docker compose build api
docker compose build ml-service
```

---

## Troubleshooting

### Docker
```bash
docker ps
docker compose logs -f
docker compose down -v && docker compose build && docker compose up -d
```

### ML Service

The ML service loads models on startup — it can take up to 90 seconds to become healthy.
The API will wait for it automatically.

```bash
curl http://localhost:8000/health
docker compose logs -f ml-service
docker compose restart ml-service
```

### Mobile
```bash
# Clear node_modules and reinstall
cd mobile && rm -rf node_modules package-lock.json && npm ci --legacy-peer-deps

# Clear Expo cache
rm -rf .expo && expo start --clear
```

### Port Conflicts
- ML service: 8000
- API: 8080
- Expo: 8081, 19000, 19001, 19002

---

## Services

| Service | Port | Type | Runs in |
|---------|------|------|---------|
| ML Service | 8000 | FastAPI | Docker |
| API | 8080 | FastAPI | Docker (depends on ML service) |
| Expo Dev | 8081+ | Node.js | Local |
| Mobile (iOS) | - | Native | Simulator/Device |
| Mobile (Android) | - | Native | Emulator/Device |

---

## Security Notes

- API and ML service use non-root user (appuser:1000)
- Multi-stage Docker builds for smaller images
- Health checks on both containers
- API and ML service communicate over internal `detector-network` bridge

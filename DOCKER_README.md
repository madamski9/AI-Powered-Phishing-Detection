# Seargin Cybersecurity - Docker & Scripts Documentation

## QUICKSTART (One Command!)

```bash
# To run project us this command:
./run.sh ios      # iOS
./run.sh android  # Android
./run.sh web      # Web
```

This single command will:
- Start API service (Docker)
- Install mobile dependencies (if needed)
- Wait for API to be ready
- Launch your chosen mobile platform
- Show useful information

---

## Project Structure

```
seargin_cybersecurity/
├── api/                          # FastAPI backend
│   ├── Dockerfile                # Python 3.11 multi-stage build
│   ├── .dockerignore
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example              # Environment template
│   └── main.py
│
├── mobile/                       # React Native / Expo frontend
│   ├── Dockerfile                # Node.js Alpine build
│   ├── .dockerignore
│   ├── package.json
│   └── ...
│
├── scripts/                      # Automation scripts
│   ├── setup-mobile.sh          # Initialize mobile dependencies
│   └── run-mobile.sh            # Run mobile on iOS/Android/Web
│
├── docker-compose.yml            # Docker Compose (API only)
├── run.sh                        # ONE COMMAND START ALL
└── DOCKER_README.md             # This file
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for mobile development)
- Xcode (for iOS) / Android SDK (for Android)

### ONE COMMAND

```bash
# Start everything with one command!
./run.sh

# Choose platform when prompted, or pass as argument:
./run.sh ios      # Directly run on iOS
./run.sh android  # Directly run on Android
./run.sh web      # Directly run on web
```

This will:
1. Start API in Docker (background)
2. Wait for API to be healthy
3. Install mobile dependencies
4. Launch your selected platform
5. Show useful commands

## Mobile App

### With run.sh (Automatic)
```bash
# Everything is automatic with run.sh!
./run.sh          # Interactive selection
./run.sh ios      # Direct iOS launch
./run.sh android  # Direct Android launch
./run.sh web      # Direct web launch
```

### Manual Mobile Setup & Run
```bash
# Setup Mobile Dependencies
./scripts/setup-mobile.sh

# Run on iOS
./scripts/run-mobile.sh ios

# Run on Android
./scripts/run-mobile.sh android

# Run on Web
./scripts/run-mobile.sh web

# Expo Dev Server Only
./scripts/run-mobile.sh start
```

## Docker Compose

### Start API Service
```bash
docker compose up -d
```

### View API Logs
```bash
docker compose logs -f api
```

### Stop Services
```bash
docker compose down
```

### Rebuild Images
```bash
docker compose build
```

## Environment Configuration

### API (.env)
Create `.env` file in `api/` directory:

```bash
cp api/.env.example api/.env
```

Edit as needed:
```
ENVIRONMENT=production
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:8081,http://localhost:19000,http://localhost:3000
```

## Troubleshooting

### Docker Issues
```bash
# Check Docker status
docker ps

# View container logs
docker compose logs -f

# Rebuild images
docker compose down -v
docker compose build
docker compose up -d
```

### Mobile Issues
```bash
# Clear node_modules and reinstall
cd mobile
rm -rf node_modules package-lock.json
npm ci --legacy-peer-deps

# Clear Expo cache
rm -rf .expo

# Restart dev server
expo start --clear
```

### Port Conflicts
- API: 8080
- Expo: 8081, 19000, 19001, 19002

## Services

| Service | Port | Type | Status |
|---------|------|------|--------|
| API | 8080 | FastAPI | Docker |
| Expo Dev | 8081+ | Node.js | Local |
| Mobile (iOS) | - | Native | Simulator/Device |
| Mobile (Android) | - | Native | Emulator/Device |

## Security Notes

- API uses non-root user (appuser:1000)
- Multi-stage Docker builds for smaller images
- Health checks enabled
- Environment variables for configuration
- .dockerignore for optimized builds

## Notes

- run.sh is the recommended way to start everything (production-ready)
- Mobile app runs separately from Docker (not in compose)
- API container includes health checks
- Scripts are production-ready with proper error handling

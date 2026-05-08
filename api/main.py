from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Seargin Cybersecurity API",
        "timestamp": datetime.now().isoformat(),
        "message": "API is running and operational"
    }
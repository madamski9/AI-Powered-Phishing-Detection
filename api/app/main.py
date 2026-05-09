from fastapi import FastAPI, Depends
from datetime import datetime
from middleware import verify_firebase

app = FastAPI()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "seargin-api",
        "timestamp": datetime.now().isoformat(),
        "message": "API is running and operational"
    }

@app.get("/protected")
def protected_route(user=Depends(verify_firebase)):
    return {
        "uid": user["uid"],
        "email": user.get("email")
    }
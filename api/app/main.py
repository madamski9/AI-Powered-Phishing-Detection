from datetime import datetime
from fastapi import Depends, FastAPI
import app.firebase.firebase_init
from app.middleware.verify_firebase import verify_firebase_token

app = FastAPI()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "seargin-api",
        "timestamp": datetime.now().isoformat(),
        "message": "API is running and operational"
    }

@app.post("/auth/google")
def protected_route(user=Depends(verify_firebase_token)):
    return {
        "uid": user["uid"],
        "email": user.get("email")
    }
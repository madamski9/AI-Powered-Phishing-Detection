import os
from datetime import datetime
from typing import Literal

import httpx
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

import app.firebase.firebase_init
from app.middleware.verify_firebase import verify_firebase_token

app = FastAPI()

ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://ml-service:8000")


class CheckRequest(BaseModel):
    type: Literal["url", "mail"]
    input: str


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "detector-api",
        "timestamp": datetime.now().isoformat(),
        "message": "API is running and operational",
    }


@app.post("/auth/google")
def protected_route(user=Depends(verify_firebase_token)):
    return {
        "uid": user["uid"],
        "email": user.get("email"),
    }


@app.post("/auth/email")
def protected_email_route(user=Depends(verify_firebase_token)):
    return {
        "uid": user["uid"],
        "email": user.get("email"),
    }


@app.post("/check-url")
async def check_url(req: CheckRequest, user=Depends(verify_firebase_token)):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/predict/{req.type}",
                json={"input": req.input},
            )
            response.raise_for_status()
            ml_result = response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"ML service error: {e.response.text}")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ML service unavailable")

    return {
        "type": req.type,
        "input": req.input,
        "is_phishing": ml_result["is_phishing"],
        "confidence": ml_result["confidence"],
    }
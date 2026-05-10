import os
from datetime import datetime

import httpx
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

import app.firebase.firebase_init
from app.middleware.verify_firebase import verify_firebase_token

app = FastAPI()

ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://ml-service:8000")


class CheckUrlRequest(BaseModel):
    input: str


class CheckMailRequest(BaseModel):
    subject: str = ""
    body: str = ""
    sender: str = ""
    urls: str = ""


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
async def check_url(req: CheckUrlRequest, _user=Depends(verify_firebase_token)):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/predict/url",
                json={"input": req.input},
            )
            response.raise_for_status()
            ml_result = response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"ML service error: {e.response.text}")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ML service unavailable")

    return {
        "input": req.input,
        "is_phishing": ml_result["is_phishing"],
        "confidence": ml_result["confidence"],
    }


@app.post("/check-mail")
async def check_mail(req: CheckMailRequest, _user=Depends(verify_firebase_token)):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/predict/mail",
                json={
                    "subject": req.subject,
                    "body": req.body,
                    "sender": req.sender,
                    "urls": req.urls,
                },
            )
            response.raise_for_status()
            ml_result = response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"ML service error: {e.response.text}")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ML service unavailable")

    return {
        "is_phishing": ml_result["is_phishing"],
        "confidence": ml_result["confidence"],
        "uncertain": ml_result.get("uncertain", False),
    }
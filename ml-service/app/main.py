from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.predictor import URLPredictor, EmailPredictor

app = FastAPI(title="ML Service - Phishing Detector")

url_predictor = URLPredictor()

try:
    email_predictor = EmailPredictor()
except Exception as e:
    print(f"[startup] EmailPredictor failed to load: {e}")
    email_predictor = None


class URLPredictRequest(BaseModel):
    input: str


class EmailFeaturePredictRequest(BaseModel):
    features: dict[str, float]


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ml-service",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/predict/url")
def predict_url(req: URLPredictRequest):
    try:
        return url_predictor.predict(req.input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/mail/features")
def predict_mail_from_features(req: EmailFeaturePredictRequest):
    if email_predictor is None:
        raise HTTPException(status_code=503, detail="Email model not loaded — check startup logs")
    try:
        return email_predictor.predict_from_features(req.features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

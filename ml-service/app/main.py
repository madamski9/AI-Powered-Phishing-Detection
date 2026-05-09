from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.predictor import URLPredictor

app = FastAPI(title="ML Service - Phishing Detector")

url_predictor = URLPredictor()


class PredictRequest(BaseModel):
    input: str


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ml-service",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/predict/url")
def predict_url(req: PredictRequest):
    try:
        return url_predictor.predict(req.input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/mail")
def predict_mail(req: PredictRequest):
    try:
        return url_predictor.predict(req.input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

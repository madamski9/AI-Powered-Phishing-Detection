import json
import sys
import joblib
import pandas as pd
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.url_model.preprocess import URLPreprocessor, MULTI_LEVEL_TLDS

MODELS_DIR = Path(__file__).parent.parent / "src" / "url_model" / "models"

# Tranco/Alexa top domains known to be legitimate.
# ML is bypassed for these registrable domains — the model simply hasn't seen
# enough of their service subdomains to classify them correctly.
TRUSTED_DOMAINS = {
    # Google ecosystem
    "google.com", "google.pl", "google.de", "google.co.uk", "google.fr",
    "googleapis.com", "googleusercontent.com", "gstatic.com",
    "withgoogle.com", "googlevideo.com", "googletagmanager.com",
    "doubleclick.net", "google-analytics.com",
    # Meta
    "facebook.com", "instagram.com", "whatsapp.com", "meta.com",
    "fbcdn.net", "fb.com",
    # Microsoft
    "microsoft.com", "live.com", "outlook.com", "office.com",
    "microsoft365.com", "microsoftonline.com", "azure.com",
    "msn.com", "bing.com", "xbox.com", "linkedin.com",
    # Apple
    "apple.com", "icloud.com",
    # Amazon / AWS
    "amazon.com", "amazon.pl", "amazon.de", "amazon.co.uk",
    "amazonaws.com", "aws.amazon.com",
    # Common services
    "github.com", "gitlab.com", "stackoverflow.com",
    "youtube.com", "netflix.com", "spotify.com", "twitch.tv",
    "twitter.com", "x.com", "reddit.com", "wikipedia.org",
    "paypal.com", "stripe.com", "cloudflare.com",
    "dropbox.com", "notion.so", "slack.com", "zoom.us",
}


def _extract_registrable_domain(domain: str) -> str:
    """Extract eTLD+1 from domain."""
    if not domain:
        return ""
    parts = domain.lower().split(".")
    if len(parts) <= 2:
        return domain.lower()
    potential_multi = ".".join(parts[-2:])
    if potential_multi in MULTI_LEVEL_TLDS:
        return ".".join(parts[-3:]) if len(parts) >= 3 else domain.lower()
    return ".".join(parts[-2:])


class URLPredictor:
    def __init__(self):
        self.model = joblib.load(MODELS_DIR / "phishing_detector.joblib")
        self.features = (MODELS_DIR / "features.txt").read_text().splitlines()

        metadata_path = MODELS_DIR / "metadata.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
            self.threshold = metadata.get("optimal_threshold", 0.45)
        else:
            self.threshold = 0.45

        self._preprocessor = URLPreprocessor("")

    def predict(self, url: str) -> dict:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        domain = urlparse(url).netloc.lower().split(":")[0]
        registrable = _extract_registrable_domain(domain)

        if registrable in TRUSTED_DOMAINS:
            return {"is_phishing": False, "confidence": 0.99, "threshold": self.threshold}

        raw_features = self._preprocessor._extract_url_features(url)
        df = pd.DataFrame([raw_features])[self.features]
        proba = float(self.model.predict_proba(df)[0][1])
        is_phishing = proba >= self.threshold
        confidence = proba if is_phishing else 1.0 - proba
        return {
            "is_phishing": is_phishing,
            "confidence": round(confidence, 4),
            "threshold": self.threshold,
        }


EMAIL_MODELS_DIR = Path(__file__).parent.parent / "src" / "email_model" / "models"


class EmailPredictor:
    def __init__(self):
        self.model = joblib.load(EMAIL_MODELS_DIR / "email_phishing_detector.joblib")
        self.features = (EMAIL_MODELS_DIR / "features.txt").read_text().splitlines()

        metadata_path = EMAIL_MODELS_DIR / "metadata.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
            self.threshold = metadata.get("optimal_threshold", 0.5)
        else:
            self.threshold = 0.5

        print("[EmailPredictor] Loaded — XGBoost (features pre-computed on device)")

    def predict_from_features(self, features: dict) -> dict:
        """Accept pre-computed feature vector from mobile — skip all preprocessing."""
        df = pd.DataFrame([features])[self.features]
        proba = float(self.model.predict_proba(df)[0][1])
        is_phishing = proba >= self.threshold
        confidence = proba if is_phishing else 1.0 - proba
        uncertain = abs(proba - 0.5) < 0.15
        return {
            "is_phishing": is_phishing,
            "confidence": round(confidence, 4),
            "uncertain": uncertain,
            "threshold": self.threshold,
            "trusted_sender": False,
        }
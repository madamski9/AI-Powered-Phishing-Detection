import json
import sys
import joblib
import pandas as pd
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.url_model.preprocess import URLPreprocessor, MULTI_LEVEL_TLDS
from src.email_model.preprocess import EmailPreprocessor

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
        # confidence = certainty of the prediction (not raw phishing probability)
        confidence = proba if is_phishing else 1.0 - proba
        return {
            "is_phishing": is_phishing,
            "confidence": round(confidence, 4),
            "threshold": self.threshold,
        }


EMAIL_MODELS_DIR = Path(__file__).parent.parent / "src" / "email_model" / "models"
EMAIL_VECTORIZER_PATH = Path(__file__).parent.parent / "data" / "emails" / "processed" / "tfidf_vectorizer.joblib"

TRUSTED_EMAIL_DOMAINS = {
    # Developer platforms
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com",
    "jetbrains.com", "atlassian.com", "jira.com", "confluence.com",
    # Google
    "google.com", "accounts.google.com", "mail.google.com",
    "googlemail.com", "google.pl",
    # Microsoft
    "microsoft.com", "outlook.com", "live.com", "office.com",
    "microsoftonline.com", "microsoft365.com", "azure.com",
    # Apple
    "apple.com", "icloud.com",
    # Meta / Social
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com",
    "x.com", "pinterest.com",
    # Polish job & e-commerce
    "pracuj.pl", "olx.pl", "allegro.pl", "ceneo.pl", "otomoto.pl",
    "otodom.pl", "gratka.pl", "jobboard.pl", "nofluffjobs.com",
    "justjoin.it", "bulldogjob.pl", "infopraca.pl","wysylka.pracuj.pl"
    # Polish banks & finance (official domains only)
    "pkobp.pl", "santander.pl", "mbank.pl", "ing.pl", "bnpparibas.pl",
    "pekao.com.pl", "aliorbank.pl", "millennium.pl", "credit-agricole.pl",
    "bos.pl", "nestbank.pl", "citibank.pl",
    # Polish services
    "pl.pl", "poczta-polska.pl", "inpost.pl", "dpd.com.pl", "gls-poland.com",
    "upc.pl", "play.pl", "orange.pl", "t-mobile.pl", "polkomtel.pl",
    "netflix.com", "spotify.com",
    # Payments
    "paypal.com", "stripe.com", "przelewy24.pl", "payu.pl", "blik.pl",
    # Cloud / infra
    "aws.amazon.com", "amazonaws.com", "cloudflare.com",
    "digitalocean.com", "heroku.com", "vercel.com", "netlify.com",
    # E-commerce
    "amazon.com", "amazon.pl", "amazon.de",
    # Package managers / dev tools
    "npmjs.com", "pypi.org", "docker.com", "hub.docker.com",
}


def _sender_domain(sender: str) -> str:
    """Extract domain from sender string like 'Name <user@domain.com>' or 'user@domain.com'."""
    import re as _re
    match = _re.search(r'<([^>]+)>', sender)
    addr = match.group(1) if match else sender.strip()
    if '@' in addr:
        return addr.split('@')[-1].lower().strip()
    return addr.lower().strip()


class EmailPredictor:
    def __init__(self):
        self.model = joblib.load(EMAIL_MODELS_DIR / "email_phishing_detector.joblib")
        self.features = (EMAIL_MODELS_DIR / "features.txt").read_text().splitlines()
        self.tfidf = joblib.load(EMAIL_VECTORIZER_PATH)

        metadata_path = EMAIL_MODELS_DIR / "metadata.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
            self.threshold = metadata.get("optimal_threshold", 0.5)
        else:
            self.threshold = 0.5

        self._prep = EmailPreprocessor("")
        print("[EmailPredictor] Loaded — char n-gram TF-IDF + XGBoost")

    def predict(self, subject: str, body: str, sender: str = "", urls: str = "") -> dict:
        # Bypass ML for known-trusted senders
        domain = _sender_domain(sender)
        if domain in TRUSTED_EMAIL_DOMAINS:
            return {
                "is_phishing": False,
                "confidence": 0.99,
                "threshold": self.threshold,
                "trusted_sender": True,
            }

        # Handcrafted features
        features = {}
        features.update(self._prep._sender_features(sender))
        features.update(self._prep._subject_features(subject))
        features.update(self._prep._body_features(body))
        features.update(self._prep._url_column_features(urls))

        # TF-IDF char n-gram features
        text = EmailPreprocessor.clean_text(subject, body)
        tfidf_vec = self.tfidf.transform([text])
        vocab = self.tfidf.get_feature_names_out()
        for feat, val in zip(vocab, tfidf_vec.toarray()[0]):
            features[f"tfidf_{feat}"] = float(val)

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

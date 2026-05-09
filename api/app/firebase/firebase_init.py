import os
from pathlib import Path

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

load_dotenv()

firebase_key_path = os.getenv("FIREBASE_KEY_PATH")

if not firebase_key_path:
	raise RuntimeError("FIREBASE_KEY_PATH is not set")

key_path = Path(firebase_key_path)
if not key_path.is_absolute():
	key_path = Path.cwd() / key_path

if not key_path.exists():
	raise RuntimeError(f"Firebase service account file not found at: {key_path}")

cred = credentials.Certificate(str(key_path))
firebase_admin.initialize_app(cred)
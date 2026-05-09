import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

load_dotenv()

firebase_key_path = os.getenv("FIREBASE_KEY_PATH")

cred = credentials.Certificate(firebase_key_path)
firebase_admin.initialize_app(cred)
import os

from fastapi import Header, HTTPException
from firebase_admin import auth


def verify_firebase_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token")

    scheme, _, token = authorization.partition(" ")
    token = token.strip() if scheme.lower() == "bearer" else authorization.strip()

    if not token:
        raise HTTPException(status_code=401, detail="No token")

    try:
        decoded = auth.verify_id_token(token)

        expected_aud = os.getenv("FIREBASE_CLIENT_ID")
        if expected_aud and decoded.get("aud") != expected_aud:
            raise HTTPException(status_code=401, detail="Invalid token audience")

        return decoded
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e) or "Invalid token")
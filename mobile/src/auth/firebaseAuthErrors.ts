const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_FOUND: "No account found for this email.",
  INVALID_PASSWORD: "Incorrect password.",
  INVALID_LOGIN_CREDENTIALS: "Invalid email or password.",
  USER_DISABLED: "This user account has been disabled.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Please try again later.",
  INVALID_EMAIL: "Invalid email address.",
  MISSING_PASSWORD: "Password is required.",
  MISSING_EMAIL: "Email address is required.",
};

const FIREBASE_AUTH_ERROR_CODES: Record<string, string> = {
  "auth/email-already-in-use": "This email is already in use.",
  "auth/invalid-email": "Invalid email address.",
  "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-disabled": "This user account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/missing-password": "Password is required.",
  "auth/missing-email": "Email address is required.",
  "auth/weak-password": "Password is too weak.",
  "auth/operation-not-allowed": "Email/password sign-in is disabled.",
};

export function getFirebaseAuthMessage(message?: string): string {
  if (!message) {
    return "Authentication failed.";
  }

  return FIREBASE_AUTH_ERROR_MESSAGES[message] ?? "Authentication failed.";
}

export function mapFirebaseAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Authentication failed.";
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : undefined;

  if (code) {
    return FIREBASE_AUTH_ERROR_CODES[code] ?? getFirebaseAuthMessage(message);
  }

  return getFirebaseAuthMessage(message);
}

export function normalizeAuthError(error: unknown, fallback = "An authentication error occurred."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return fallback;
}
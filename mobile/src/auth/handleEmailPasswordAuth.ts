import { tryCatch } from "../utils/try-catch";
import type { AuthErrorLike } from "./handleGoogleAuth";

type EmailPasswordPayload = {
  email: string;
  password: string;
};

type FirebaseEmailPasswordSuccessResponse = {
  localId: string;
  email: string;
  displayName?: string;
  idToken: string;
  photoUrl?: string;
};

export type EmailPasswordAuthResult =
  | { ok: false; error?: AuthErrorLike }
  | {
      ok: true;
      user: {
        id: string;
        email?: string;
        name?: string;
        photo?: string;
      };
      idToken?: string;
    };

function mapFirebaseError(message?: string): string {
  if (!message) {
    return "Email/password sign-in failed.";
  }

  const dictionary: Record<string, string> = {
    EMAIL_NOT_FOUND: "No account found for this email.",
    INVALID_PASSWORD: "Incorrect password.",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password.",
    USER_DISABLED: "This user account has been disabled.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Please try again later.",
    INVALID_EMAIL: "Invalid email address.",
    MISSING_PASSWORD: "Password is required.",
  };

  return dictionary[message] ?? "Email/password sign-in failed.";
}

export async function handleEmailPasswordAuth({
  email,
  password,
}: EmailPasswordPayload): Promise<EmailPasswordAuthResult> {
  const firebaseWebApiKey = process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY;

  if (!firebaseWebApiKey) {
    return {
      ok: false,
      error: "Missing EXPO_PUBLIC_FIREBASE_WEB_API_KEY environment variable.",
    };
  }

  const [response, requestError] = await tryCatch(
    fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    ),
  );

  if (requestError || !response) {
    return { ok: false, error: requestError };
  }

  const [jsonBody, parseError] = await tryCatch(response.json() as Promise<Record<string, unknown>>);
  if (parseError || !jsonBody) {
    return { ok: false, error: parseError ?? "Failed to parse sign-in response." };
  }

  if (!response.ok) {
    const firebaseMessage =
      typeof jsonBody.error === "object" &&
      jsonBody.error !== null &&
      typeof (jsonBody.error as { message?: unknown }).message === "string"
        ? ((jsonBody.error as { message: string }).message as string)
        : undefined;

    return { ok: false, error: mapFirebaseError(firebaseMessage) };
  }

  const successBody = jsonBody as unknown as FirebaseEmailPasswordSuccessResponse;

  return {
    ok: true,
    user: {
      id: successBody.localId,
      email: successBody.email,
      name: successBody.displayName,
      photo: successBody.photoUrl,
    },
    idToken: successBody.idToken,
  };
}

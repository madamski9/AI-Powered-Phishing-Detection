import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { tryCatch } from "../utils/try-catch";

type GoogleUserPayload = {
    id: string;
    email?: string | null;
    name?: string | null;
    photo?: string | null;
}

export type AuthErrorLike = Error | string | { message?: string } | null | undefined;

export type GoogleAuthResult =
    | { ok: false; error?: AuthErrorLike }
    | { ok: true; idToken?: string | null; name?: string | null; user: GoogleUserPayload };

export async function handleGoogleAuth(): Promise<GoogleAuthResult> {
    await GoogleSignin.hasPlayServices()
    const [response, signInError] = await tryCatch(GoogleSignin.signIn())
    if (signInError || !response) {
        return { ok: false, error: signInError };
    }
    if (!isSuccessResponse(response)) {
        return { ok: false, error: "Google sign-in failed." };
    }
    const { idToken, user } = response.data;
    const { name } = user;
    return { ok: true, idToken, user, name };
}
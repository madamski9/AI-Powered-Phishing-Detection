import { signInWithEmailAndPassword } from "firebase/auth";

import { firebaseAuth } from "../../firebase/firebase";
import { mapFirebaseAuthError } from "../firebaseAuthErrors";

type AuthErrorLike = unknown;

type EmailPasswordPayload = {
  email: string;
  password: string;
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

export async function handleEmailPasswordAuth({
  email,
  password,
}: EmailPasswordPayload): Promise<EmailPasswordAuthResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    return {
      ok: true,
      user: {
        id: user.uid,
        email: user.email ?? undefined,
        name: user.displayName ?? undefined,
        photo: user.photoURL ?? undefined,
      },
      idToken,
    };
  } catch (error) {
    return {
      ok: false,
      error: mapFirebaseAuthError(error),
    };
  }
}

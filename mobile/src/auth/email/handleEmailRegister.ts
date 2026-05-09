import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { firebaseAuth } from "../../firebase/firebase";
import { mapFirebaseAuthError } from "../firebaseAuthErrors";

type AuthErrorLike = unknown;

type EmailRegisterPayload = {
	email: string;
	password: string;
	name?: string;
};

export type EmailRegisterResult =
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

export async function handleEmailRegister({
	email,
	password,
	name,
}: EmailRegisterPayload): Promise<EmailRegisterResult> {
	try {
		const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

		if (name) {
			await updateProfile(userCredential.user, { displayName: name });
		}

		const idToken = await userCredential.user.getIdToken();

		return {
			ok: true,
			user: {
				id: userCredential.user.uid,
				email: userCredential.user.email ?? undefined,
				name: userCredential.user.displayName ?? name,
				photo: userCredential.user.photoURL ?? undefined,
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
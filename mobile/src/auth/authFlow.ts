import { AuthStatus } from "../enum/authStatus";

export type AuthUser = {
	id: string;
	email?: string;
	name?: string;
	photo?: string;
	idToken?: string;
};

type FirebaseUserLike = {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
};

function nullToUndefined(value: string | null | undefined): string | undefined {
	return value ?? undefined;
}

export function buildAuthUser(user: FirebaseUserLike, idToken: string, fallbackName?: string | null): AuthUser {
	return {
		id: user.uid,
		email: user.email ?? undefined,
		name: user.displayName ?? nullToUndefined(fallbackName),
		photo: user.photoURL ?? undefined,
		idToken,
	};
}

export function resolveBackendAuthStatus(data: unknown): AuthStatus {
	if (
		typeof data === "object" &&
		data !== null &&
		"status" in data &&
		typeof (data as { status?: unknown }).status === "string"
	) {
		return (data as { status: AuthStatus }).status;
	}

	return AuthStatus.LOGGED_IN;
}
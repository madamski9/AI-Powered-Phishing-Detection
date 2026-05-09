import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { handleGoogleAuth } from "../auth/handleGoogleAuth";
import { handleEmailPasswordAuth } from "../auth/handleEmailPasswordAuth";
import { tryCatch } from "../utils/try-catch";
import { loginWithGoogle } from "../auth/loginWithGoogle";
import { AuthStatus } from "../enum/authStatus";
import { firebaseAuth } from "../firebase/firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

type AuthUser = {
	id: string;
	email?: string;
	name?: string;
	photo?: string;
	idToken?: string;
};

type AuthContextValue = {
	user: AuthUser | null;
	isAuthenticated: boolean;
	authStatus: AuthStatus;
	loading: boolean;
	error: string | null;
	signInWithEmailPassword: (email: string, password: string) => Promise<AuthActionResult>;
	signInWithGoogle: () => Promise<AuthActionResult>;
	logout: () => Promise<void>;
	clearError: () => void;
};

type AuthActionResult = {
	status: AuthStatus;
	error?: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function nullToUndefined(value: string | null | undefined): string | undefined {
	return value ?? undefined;
}

function normalizeError(error: any): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === "object" && error !== null && "message" in error) {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) {
			return message;
		}
	}

	if (typeof error === "string" && error.length > 0) {
		return error;
	}

	return "An authentication error occurred.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.ERROR);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
		setLoading(true);
		setError(null);

		const [response, signInError] = await tryCatch(handleEmailPasswordAuth({ email, password }));

		if (signInError || !response) {
			setUser(null);
			setAuthStatus(AuthStatus.ERROR);
			setError(normalizeError(signInError));
			setLoading(false);
			return { status: AuthStatus.ERROR, error: normalizeError(signInError) };
		}

		if (!response.ok) {
			setUser(null);
			setAuthStatus(AuthStatus.ERROR);
			setError(normalizeError(response.error ?? null));
			setLoading(false);
			return { status: AuthStatus.ERROR, error: normalizeError(response.error ?? null) };
		}

		setUser({
			id: response.user.id,
			email: response.user.email,
			name: response.user.name,
			photo: response.user.photo,
			idToken: response.idToken,
		});
		setAuthStatus(AuthStatus.LOGGED_IN);
		setLoading(false);
		return { status: AuthStatus.LOGGED_IN };
	}, []);

	const signInWithGoogle = useCallback(async () => {
		setLoading(true);
		setError(null);

		const googleResult = await handleGoogleAuth();
		if (!googleResult.ok) {
			setUser(null);
			setAuthStatus(AuthStatus.ERROR);
			const message = normalizeError(googleResult.error ?? null);
			setError(message);
			setLoading(false);
			return { status: AuthStatus.ERROR, error: message };
		}

		const { idToken, name } = googleResult;
		if (idToken) {
			try {
				const credential = GoogleAuthProvider.credential(idToken);
				const userCred = await signInWithCredential(firebaseAuth, credential);
				const firebaseIdToken = await userCred.user.getIdToken();
				const loginResult = await loginWithGoogle({ idToken: firebaseIdToken, name });
				console.log("login result: ", loginResult)
			if (loginResult.error) {
				setUser(null);
				setAuthStatus(AuthStatus.ERROR);
				setError(normalizeError(loginResult.error));
				setLoading(false);
				return { status: AuthStatus.ERROR, error: normalizeError(loginResult.error) };
			}

			const backendStatus =
				typeof loginResult.data === "object" &&
				loginResult.data !== null &&
				"status" in loginResult.data &&
				typeof (loginResult.data as { status?: unknown }).status === "string"
					? ((loginResult.data as { status: AuthStatus }).status)
					: AuthStatus.LOGGED_IN;
			setAuthStatus(backendStatus);
			setUser({
				id: userCred.user.uid,
				email: userCred.user.email ?? undefined,
				name: userCred.user.displayName ?? nullToUndefined(name),
				photo: userCred.user.photoURL ?? undefined,
				idToken: firebaseIdToken,
			});
			setLoading(false);
			return { status: backendStatus };
		} catch (err) {
			setError(normalizeError(err));
			setAuthStatus(AuthStatus.ERROR);
			setLoading(false);
			return { status: AuthStatus.ERROR, error: normalizeError(err) };
		}

		}

		setUser(null);
		setAuthStatus(AuthStatus.ERROR);
		setLoading(false);
		return { status: AuthStatus.ERROR, error: "Unknown user status" };
	}, []);

	const logout = useCallback(async () => {
		setLoading(true);
		setError(null);

		const [, logoutError] = await tryCatch(GoogleSignin.signOut());

		if (logoutError) {
			setError(normalizeError(logoutError));
			setLoading(false);
			return;
		}

		setUser(null);
		setLoading(false);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			isAuthenticated: Boolean(user),
			authStatus,
			loading,
			error,
			signInWithEmailPassword,
			signInWithGoogle,
			logout,
			clearError,
		}),
		[authStatus, clearError, error, loading, logout, signInWithEmailPassword, signInWithGoogle, user],
	);

	return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within AuthProvider.");
	}

	return context;
}
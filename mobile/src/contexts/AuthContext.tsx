import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { handleGoogleAuth } from "../auth/google/handleGoogleAuth";
import { handleEmailPasswordAuth } from "../auth/email/handleEmailPasswordAuth";
import { handleEmailRegister } from "../auth/email/handleEmailRegister";
import { tryCatch } from "../utils/try-catch";
import { loginWithGoogle } from "../auth/google/loginWithGoogle";
import { loginWithEmail } from "../auth/email/loginWithEmail";
import { AuthStatus } from "../enum/authStatus";
import { firebaseAuth } from "../firebase/firebase";
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut } from "firebase/auth";
import { normalizeAuthError } from "../auth/firebaseAuthErrors";
import { buildAuthUser, resolveBackendAuthStatus } from "../auth/authFlow";
import type { AuthUser } from "../auth/authFlow";

type AuthContextValue = {
	user: AuthUser | null;
	isAuthenticated: boolean;
	authStatus: AuthStatus;
	loading: boolean;
	error: string | null;
	signInWithEmailPassword: (email: string, password: string) => Promise<AuthActionResult>;
	signUpWithEmailPassword: (email: string, password: string, name?: string) => Promise<AuthActionResult>;
	signInWithGoogle: () => Promise<AuthActionResult>;
	logout: () => Promise<void>;
	clearError: () => void;
};

type AuthActionResult = {
	status: AuthStatus;
	error?: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.ERROR);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
			if (!firebaseUser) {
				setUser(null);
				setLoading(false);
				return;
			}

			try {
				const firebaseIdToken = await firebaseUser.getIdToken();
				const firstName = firebaseUser.displayName?.trim().split(" ")[0];

				setUser(buildAuthUser(firebaseUser, firebaseIdToken, firstName));
				setAuthStatus(AuthStatus.LOGGED_IN);
			} catch {
				setUser(null);
			}

			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const failAuth = useCallback((message: string) => {
		setUser(null);
		setAuthStatus(AuthStatus.ERROR);
		setError(message);
		setLoading(false);
		return { status: AuthStatus.ERROR, error: message };
	}, []);

	const succeedAuth = useCallback((nextUser: AuthUser, status: AuthStatus) => {
		setUser(nextUser);
		setAuthStatus(status);
		setLoading(false);
		return { status };
	}, []);

	const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
		setLoading(true);
		setError(null);

		const [response, signInError] = await tryCatch(handleEmailPasswordAuth({ email, password }));
		if (signInError || !response) {
			return failAuth(normalizeAuthError(signInError));
		}

		if (!response.ok) {
			return failAuth(normalizeAuthError(response.error ?? null));
		}

		try {
			const loginResult = await loginWithEmail({ idToken: response.idToken ?? null });
			if (loginResult.error) {
				return failAuth(normalizeAuthError(loginResult.error));
			}

			const backendStatus = resolveBackendAuthStatus(loginResult.data);
			return succeedAuth({ ...response.user, idToken: response.idToken }, backendStatus);
		} catch (err) {
			return failAuth(normalizeAuthError(err));
		}
	}, [failAuth, succeedAuth]);

	const signUpWithEmailPassword = useCallback(async (email: string, password: string, name?: string) => {
		setLoading(true);
		setError(null);

		const [response, signUpError] = await tryCatch(handleEmailRegister({ email, password, name }));
		if (signUpError || !response) {
			return failAuth(normalizeAuthError(signUpError));
		}

		if (!response.ok) {
			return failAuth(normalizeAuthError(response.error ?? null));
		}

		try {
			const loginResult = await loginWithEmail({ idToken: response.idToken ?? null });
			if (loginResult.error) {
				return failAuth(normalizeAuthError(loginResult.error));
			}

			const backendStatus = resolveBackendAuthStatus(loginResult.data);
			return succeedAuth({ ...response.user, idToken: response.idToken }, backendStatus);
		} catch (err) {
			return failAuth(normalizeAuthError(err));
		}
	}, [failAuth, succeedAuth]);

	const signInWithGoogle = useCallback(async () => {
		setLoading(true);
		setError(null);

		const googleResult = await handleGoogleAuth();
		if (!googleResult.ok) {
			return failAuth(normalizeAuthError(googleResult.error ?? null));
		}

		const { idToken, name, givenName } = googleResult;
		if (idToken) {
			try {
				const credential = GoogleAuthProvider.credential(idToken);
				const userCred = await signInWithCredential(firebaseAuth, credential);
				const firebaseIdToken = await userCred.user.getIdToken();
				const loginResult = await loginWithGoogle({ idToken: firebaseIdToken, name });
				if (loginResult.error) {
					return failAuth(normalizeAuthError(loginResult.error));
				}

				const backendStatus = resolveBackendAuthStatus(loginResult.data);

				return succeedAuth(
					buildAuthUser(userCred.user, firebaseIdToken, givenName ?? name),
					backendStatus,
				);
			} catch (err) {
				return failAuth(normalizeAuthError(err));
			}
		}

		return failAuth("Unknown user status");
	}, [failAuth, succeedAuth]);

	const logout = useCallback(async () => {
		setLoading(true);
		setError(null);

		const [, signOutError] = await tryCatch(signOut(firebaseAuth));

		if (signOutError) {
			setError(normalizeAuthError(signOutError));
			setLoading(false);
			return;
		}

		const [, googleSignOutError] = await tryCatch(GoogleSignin.signOut());

		if (googleSignOutError) {
			console.warn("Google sign out error:", googleSignOutError);
		}
		setUser(null);
		setAuthStatus(AuthStatus.ERROR);
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
			signUpWithEmailPassword,
			signInWithGoogle,
			logout,
			clearError,
		}),
		[authStatus, clearError, error, loading, logout, signInWithEmailPassword, signInWithGoogle, signUpWithEmailPassword, user],
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
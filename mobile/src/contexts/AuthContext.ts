import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { handleGoogleAuth, type AuthErrorLike } from "../auth/handleGoogleAuth";
import { handleEmailPasswordAuth } from "../auth/handleEmailPasswordAuth";
import { tryCatch } from "../utils/try-catch";

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
	loading: boolean;
	error: string | null;
	signInWithEmailPassword: (email: string, password: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function nullToUndefined(value: string | null | undefined): string | undefined {
	return value ?? undefined;
}

function normalizeError(error: AuthErrorLike): string {
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
			setError(normalizeError(signInError));
			setLoading(false);
			return;
		}

		if (!response.ok) {
			setUser(null);
			setError(normalizeError(response.error ?? null));
			setLoading(false);
			return;
		}

		setUser({
			id: response.user.id,
			email: response.user.email,
			name: response.user.name,
			photo: response.user.photo,
			idToken: response.idToken,
		});
		setLoading(false);
	}, []);

	const signInWithGoogle = useCallback(async () => {
		setLoading(true);
		setError(null);

		const [response, signInError] = await tryCatch(handleGoogleAuth());

		if (signInError || !response) {
			setUser(null);
			setError(normalizeError(signInError));
			setLoading(false);
			return;
		}

		if (!response.ok) {
			setUser(null);
			setError(normalizeError(response.error ?? null));
			setLoading(false);
			return;
		}

		const parsedUser = response.user;
		const parsedName = nullToUndefined(response.name);

		setUser({
			id: parsedUser.id,
			email: nullToUndefined(parsedUser.email),
			name: parsedName ?? nullToUndefined(parsedUser.name),
			photo: nullToUndefined(parsedUser.photo),
			idToken: nullToUndefined(response.idToken),
		});
		setLoading(false);
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
			loading,
			error,
			signInWithEmailPassword,
			signInWithGoogle,
			logout,
			clearError,
		}),
		[clearError, error, loading, logout, signInWithEmailPassword, signInWithGoogle, user],
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
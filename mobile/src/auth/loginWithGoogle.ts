import { tryCatch } from "../utils/try-catch";
interface LoginProps {
  idToken: string | null;
  name: string | null;
}
export async function loginWithGoogle({ idToken, name }: LoginProps) {
    const url = process.env.EXPO_PUBLIC_API_GOOGLE_AUTH_URL;
    if (!url) {
        return { ok: false, error: "Missing EXPO_PUBLIC_API_GOOGLE_AUTH_URL" };
    }

    const [responseLogin, backendError] = await tryCatch(
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`,
            },
        }),
    );
    if (backendError || !responseLogin) {
        const msg = backendError?.message ?? String(backendError) ?? "Network request failed";
        return { ok: false, error: msg };
    }
    const [dataLogin, jsonError] = await tryCatch(responseLogin.json());
    if (jsonError || !responseLogin.ok) {
        const payload = typeof dataLogin === "object" ? JSON.stringify(dataLogin) : String(dataLogin);
        return { ok: false, error: payload };
    }
    return { ok: true, data: dataLogin, name };
}
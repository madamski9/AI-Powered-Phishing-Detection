import { tryCatch } from "../../utils/try-catch";
interface LoginProps {
  idToken: string | null;
  name: string | null;
}
export async function loginWithGoogle({ idToken, name }: LoginProps) {
    const [responseLogin, backendError] = await tryCatch(
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/google`, {
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
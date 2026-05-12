import { tryCatch } from '../utils/try-catch'
import { extractEmailFeatures } from '../utils/emailFeatures'

interface CheckMailParams {
    subject: string
    body: string
    sender: string
    urls?: string
}

interface CheckMailResponse {
    is_phishing: boolean
    confidence: number
    uncertain: boolean
}

export async function checkMail(
    params: CheckMailParams,
    idToken: string,
): Promise<{ ok: true; data: CheckMailResponse } | { ok: false; error: string }> {
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/check-mail/features`

    const features = extractEmailFeatures(
        params.subject.slice(0, 500),
        params.body.slice(0, 3000),
        params.sender,
        params.urls ?? '',
    )


    const [response, networkError] = await tryCatch(
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ features }),
        }),
    )

    if (networkError || !response) {
        return { ok: false, error: networkError?.message ?? 'Network request failed' }
    }


    const [data, jsonError] = await tryCatch(response.json())
    if (jsonError || !response.ok) {
        const payload = typeof data === 'object' ? JSON.stringify(data) : String(data)
        return { ok: false, error: payload }
    }

    return { ok: true, data }
}

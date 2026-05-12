import { tryCatch } from '../utils/try-catch'

interface CheckUrlResponse {
    type: 'url' | 'mail'
    input: string
    is_phishing: boolean
    confidence: number
}

export async function checkUrl(url: string, idToken: string): Promise<{ ok: true; data: CheckUrlResponse } | { ok: false; error: string }> {
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/check-url`

    const [response, networkError] = await tryCatch(
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ type: 'url', input: url }),
        })
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

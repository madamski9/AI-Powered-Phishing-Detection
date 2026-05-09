import { tryCatch } from '../utils/try-catch'

interface CheckUrlResponse {
    type: 'url' | 'mail'
    input: string
    is_phishing: boolean
    confidence: number
}

export async function checkUrl(url: string, idToken: string): Promise<{ ok: true; data: CheckUrlResponse } | { ok: false; error: string }> {
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/check-url`
    console.log('[checkUrl] POST', endpoint, { type: 'url', input: url })

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
        console.error('[checkUrl] Network error:', networkError?.message)
        return { ok: false, error: networkError?.message ?? 'Network request failed' }
    }

    console.log('[checkUrl] Response status:', response.status)

    const [data, jsonError] = await tryCatch(response.json())
    if (jsonError || !response.ok) {
        const payload = typeof data === 'object' ? JSON.stringify(data) : String(data)
        console.error('[checkUrl] API error:', payload)
        return { ok: false, error: payload }
    }

    console.log('[checkUrl] Result:', data)
    return { ok: true, data }
}

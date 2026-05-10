import { tryCatch } from '../utils/try-catch'

interface CheckMailResponse {
    type: 'mail'
    input: string
    is_phishing: boolean
    confidence: number
}

export async function checkMail(
    emailBody: string,
    idToken: string,
): Promise<{ ok: true; data: CheckMailResponse } | { ok: false; error: string }> {
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/check-url`

    console.log('[checkMail] POST', endpoint, '| body chars:', emailBody.length)

    const [response, networkError] = await tryCatch(
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ type: 'mail', input: emailBody.slice(0, 3000) }),
        }),
    )

    if (networkError || !response) {
        console.error('[checkMail] Network error:', networkError?.message)
        return { ok: false, error: networkError?.message ?? 'Network request failed' }
    }

    console.log('[checkMail] Response status:', response.status)

    const [data, jsonError] = await tryCatch(response.json())
    if (jsonError || !response.ok) {
        const payload = typeof data === 'object' ? JSON.stringify(data) : String(data)
        console.error('[checkMail] API error:', payload)
        return { ok: false, error: payload }
    }

    console.log('[checkMail] Result — is_phishing:', data.is_phishing, 'confidence:', data.confidence)
    return { ok: true, data }
}
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

    console.log(
        '[checkMail] POST', endpoint,
        '| features computed on device, feature count:', Object.keys(features).length,
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

    console.log('[checkMail] Result — is_phishing:', data.is_phishing, 'confidence:', data.confidence, 'uncertain:', data.uncertain)
    return { ok: true, data }
}

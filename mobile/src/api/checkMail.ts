import { tryCatch } from '../utils/try-catch'

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
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/check-mail`

    console.log(
        '[checkMail] POST', endpoint,
        '| subject:', params.subject.slice(0, 60),
        '| body chars:', params.body.length,
        '| sender:', params.sender,
    )

    const [response, networkError] = await tryCatch(
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                subject: params.subject.slice(0, 500),
                body: params.body.slice(0, 3000),
                sender: params.sender,
                urls: params.urls ?? '',
            }),
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

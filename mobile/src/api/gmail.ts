import { GoogleSignin } from '@react-native-google-signin/google-signin'

const GMAIL_BASE = process.env.EXPO_PUBLIC_GMAIL_API_BASE
const TOKENINFO_URL = process.env.EXPO_PUBLIC_GOOGLE_TOKENINFO_URL

export class GmailScopeError extends Error {
    constructor() {
        super('gmail_scope_missing')
    }
}

export interface GmailMessage {
    id: string
    from: string
    fromEmail: string
    subject: string
    dateStr: string
    snippet: string
}

export async function getGmailAccessToken(): Promise<string | null> {
    try {
        const stale = await GoogleSignin.getTokens()
        const staleToken = (stale as any).accessToken
        console.log('[gmail] stale accessToken present:', !!staleToken)
        if (staleToken) {
            await GoogleSignin.clearCachedAccessToken(staleToken)
            console.log('[gmail] cleared cached access token')
        }
        const fresh = await GoogleSignin.getTokens()
        const freshToken = (fresh as any).accessToken ?? null
        console.log('[gmail] fresh accessToken present:', !!freshToken)
        if (freshToken) {
            fetch(`${TOKENINFO_URL}?access_token=${freshToken}`)
                .then(r => r.json())
                .then(info => console.log('[gmail] token scopes:', info.scope ?? info.error_description ?? info))
                .catch(() => {})
        }
        return freshToken
    } catch (e: any) {
        console.error('[gmail] getGmailAccessToken error:', e?.message ?? e)
        return null
    }
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
    return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseFrom(raw: string): { name: string; email: string } {
    const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
    if (match) return { name: match[1].trim() || match[2], email: match[2] }
    return { name: raw, email: raw }
}

function formatGmailDate(raw: string): string {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    if (diffDays < 7) return d.toLocaleDateString('pl-PL', { weekday: 'short' })
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

export async function fetchGmailMessages(accessToken: string, query?: string): Promise<GmailMessage[]> {
    const params: Record<string, string> = { maxResults: '20' }
    if (query?.trim()) params.q = query.trim()
    console.log('[gmail] fetchGmailMessages query:', query ?? '(none)')

    const listResp = await fetch(
        `${GMAIL_BASE}/messages?${new URLSearchParams(params)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    console.log('[gmail] list messages status:', listResp.status)
    if (!listResp.ok) {
        const text = await listResp.text()
        console.error(`[gmail] list messages ${listResp.status} body:`, text.slice(0, 300))
        if (listResp.status === 403 && text.includes('insufficientPermissions')) {
            throw new GmailScopeError()
        }
        throw new Error(`Gmail ${listResp.status}: ${text.slice(0, 120)}`)
    }

    const listData = await listResp.json()
    const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id)
    console.log('[gmail] message ids count:', ids.length)
    if (ids.length === 0) return []

    const settled = await Promise.allSettled(
        ids.map(async (id) => {
            const resp = await fetch(
                `${GMAIL_BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            )
            if (!resp.ok) {
                console.warn('[gmail] metadata fetch failed for', id, 'status:', resp.status)
                throw new Error(`msg ${id} error ${resp.status}`)
            }
            const data = await resp.json()
            const headers: Array<{ name: string; value: string }> = data.payload?.headers ?? []
            const { name, email } = parseFrom(extractHeader(headers, 'From'))
            return {
                id,
                from: name || email || 'Nieznany nadawca',
                fromEmail: email !== name ? email : '',
                subject: extractHeader(headers, 'Subject') || '(bez tematu)',
                dateStr: formatGmailDate(extractHeader(headers, 'Date')),
                snippet: (data.snippet as string | undefined)?.trim() ?? '',
            } satisfies GmailMessage
        }),
    )

    const failed = settled.filter(r => r.status === 'rejected').length
    if (failed > 0) console.warn('[gmail] failed to fetch metadata for', failed, 'message(s)')

    const messages = settled
        .filter((r): r is PromiseFulfilledResult<GmailMessage> => r.status === 'fulfilled')
        .map(r => r.value)
    console.log('[gmail] fetched', messages.length, 'messages successfully')
    return messages
}

function decodeBase64Url(encoded: string): string {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    try {
        return decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        )
    } catch {
        return ''
    }
}

function extractTextFromPayload(payload: Record<string, any>): string {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return decodeBase64Url(payload.body.data)
    }
    if (Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            const text = extractTextFromPayload(part)
            if (text) return text
        }
    }
    return ''
}

export async function fetchMessageBody(accessToken: string, messageId: string): Promise<string> {
    console.log('[gmail] fetchMessageBody id:', messageId)
    const resp = await fetch(
        `${GMAIL_BASE}/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    console.log('[gmail] fetch body status:', resp.status)
    if (!resp.ok) throw new Error(`Failed to fetch message body (${resp.status})`)
    const data = await resp.json()
    const text = extractTextFromPayload(data.payload ?? {}) || (data.snippet as string | undefined) || ''
    console.log('[gmail] body length:', text.length, 'chars')
    return text
}

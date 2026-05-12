import { GoogleSignin } from '@react-native-google-signin/google-signin'

const GMAIL_BASE = process.env.EXPO_PUBLIC_GMAIL_API_BASE

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
        await GoogleSignin.signInSilently()

        const stale = await GoogleSignin.getTokens()
        const staleToken = (stale as any).accessToken
        if (staleToken) {
            await GoogleSignin.clearCachedAccessToken(staleToken)
        }
        const fresh = await GoogleSignin.getTokens()
        const freshToken = (fresh as any).accessToken ?? null
        return freshToken
    } catch (e: any) {
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

    const listResp = await fetch(
        `${GMAIL_BASE}/messages?${new URLSearchParams(params)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!listResp.ok) {
        const text = await listResp.text()
        if (listResp.status === 403 && text.includes('insufficientPermissions')) {
            throw new GmailScopeError()
        }
        throw new Error(`Gmail ${listResp.status}: ${text.slice(0, 120)}`)
    }

    const listData = await listResp.json()
    const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id)
    if (ids.length === 0) return []

    const settled = await Promise.allSettled(
        ids.map(async (id) => {
            const resp = await fetch(
                `${GMAIL_BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            )
            if (!resp.ok) {
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

    const messages = settled
        .filter((r): r is PromiseFulfilledResult<GmailMessage> => r.status === 'fulfilled')
        .map(r => r.value)
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
    const resp = await fetch(
        `${GMAIL_BASE}/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!resp.ok) throw new Error(`Failed to fetch message body (${resp.status})`)
    const data = await resp.json()
    const text = extractTextFromPayload(data.payload ?? {}) || (data.snippet as string | undefined) || ''
    return text
}

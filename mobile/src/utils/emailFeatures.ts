import tfidfVocab from './tfidf_vocab.json'

const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com', 'gmx.com',
    'yandex.ru', 'mail.ru', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl',
    'yahoo.co.uk', 'hotmail.co.uk', 'msn.com',
])

const SUSPICIOUS_TLDS = new Set([
    'tk', 'ml', 'ga', 'cf', 'xyz', 'top', 'stream', 'racing', 'win',
    'cricket', 'faith', 'date', 'men', 'science', 'trade', 'accountant',
    'bid', 'click', 'party', 'space', 'website', 'webcam', 'ru', 'ua',
])

const URGENCY_WORDS = [
    'urgent', 'immediately', 'asap', 'action required', 'verify',
    'suspended', 'expire', 'expiration', 'alert', 'warning', 'limited',
    'deadline', 'act now', 'important', 'confirm', 'validate', 'update',
    'secure', 'click here', 'log in', 'sign in', 'password', 'account',
    'unauthorized', 'suspicious', 'compromised', 'locked', 'blocked',
    'pilne', 'natychmiast', 'wymagane', 'zweryfikuj', 'zawieszone',
    'wygasa', 'wygaśnie', 'ostrzeżenie', 'uwaga', 'ograniczone',
    'termin', 'działaj', 'ważne', 'potwierdź', 'zaktualizuj',
    'bezpieczny', 'kliknij tutaj', 'zaloguj', 'hasło', 'konto',
    'nieautoryzowany', 'podejrzany', 'zablokowane', 'zablokowany',
    'weryfikacja', 'aktywacja', 'reaktywacja', 'przywróć', 'odblokuj',
]

const PHISHING_KEYWORDS = [
    'prize', 'winner', 'congratulation', 'lottery', 'claim', 'reward',
    'free', 'gift', 'bonus', 'exclusive', 'selected', 'won',
    'bank', 'paypal', 'credit card', 'social security', 'ssn',
    'refund', 'invoice', 'payment', 'transaction', 'wire transfer',
    'bitcoin', 'crypto', 'invest', 'profit', 'earning',
    'nagroda', 'wygrałeś', 'wygrałaś', 'gratulacje', 'loteria',
    'odbierz', 'darmowy', 'darmowa', 'prezent', 'premia', 'ekskluzywny',
    'wybrany', 'wybrałeś', 'bank', 'karta kredytowa', 'pesel',
    'zwrot', 'faktura', 'płatność', 'przelew', 'bitcoin', 'kryptowaluta',
    'inwestycja', 'zysk', 'zarobek', 'pożyczka', 'kredyt',
]

function entropy(text: string): number {
    if (!text) return 0
    const counts: Record<string, number> = {}
    for (const c of text) counts[c] = (counts[c] ?? 0) + 1
    const n = text.length
    return -Object.values(counts).reduce((acc, c) => {
        const p = c / n
        return acc + p * Math.log2(p + 1e-10)
    }, 0)
}

function parseSenderDomain(sender: string): string {
    const match = sender.match(/<([^>]+)>/)
    const addr = match ? match[1] : sender.trim()
    if (addr.includes('@')) return addr.split('@').pop()!.toLowerCase().trim()
    return ''
}

function extractTld(domain: string): string {
    const parts = domain.split('.')
    return parts.length ? parts[parts.length - 1] : ''
}


function senderFeatures(sender: string): Record<string, number> {
    const domain = parseSenderDomain(sender)
    const tld = extractTld(domain)
    const parts = domain.split('.')
    const domainName = parts.length >= 2 ? parts[parts.length - 2] : domain
    return {
        sender_is_free_email: FREE_EMAIL_DOMAINS.has(domain) ? 1 : 0,
        sender_domain_length: domain.length,
        sender_domain_has_digits: /\d/.test(domainName) ? 1 : 0,
        sender_suspicious_tld: SUSPICIOUS_TLDS.has(tld) ? 1 : 0,
        sender_subdomain_count: Math.max(0, parts.length - 2),
        sender_domain_entropy: entropy(domainName),
    }
}

function subjectFeatures(subject: string): Record<string, number> {
    const lower = subject.toLowerCase()
    const urgencyCount = URGENCY_WORDS.filter(w => lower.includes(w)).length
    const phishingCount = PHISHING_KEYWORDS.filter(w => lower.includes(w)).length
    const uppercaseRatio = subject.length
        ? [...subject].filter(c => c >= 'A' && c <= 'Z').length / subject.length
        : 0
    return {
        subject_length: subject.length,
        subject_is_empty: subject.trim().length === 0 ? 1 : 0,
        subject_word_count: subject.split(/\s+/).filter(Boolean).length,
        subject_uppercase_ratio: uppercaseRatio,
        subject_digit_count: [...subject].filter(c => c >= '0' && c <= '9').length,
        subject_exclamation_count: (subject.match(/!/g) ?? []).length,
        subject_question_count: (subject.match(/\?/g) ?? []).length,
        subject_urgency_words: urgencyCount,
        subject_phishing_keywords: phishingCount,
        subject_entropy: entropy(subject),
    }
}

function bodyFeatures(body: string): Record<string, number> {
    const lower = body.toLowerCase()
    const htmlTags = body.match(/<[^>]+>/g) ?? []
    const clean = body.replace(/<[^>]+>/g, ' ')
    const words = clean.split(/\s+/).filter(Boolean)
    const charCount = body.length
    const urgencyCount = URGENCY_WORDS.filter(w => lower.includes(w)).length
    const phishingCount = PHISHING_KEYWORDS.filter(w => lower.includes(w)).length
    const urlCount = (lower.match(/https?:\/\//g) ?? []).length
    const ipUrlCount = (lower.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) ?? []).length
    const avgWordLen = words.length
        ? words.reduce((acc, w) => acc + w.length, 0) / words.length
        : 0
    return {
        body_length: charCount,
        body_word_count: words.length,
        body_is_html: htmlTags.length > 0 ? 1 : 0,
        body_html_tag_count: htmlTags.length,
        body_uppercase_ratio: charCount ? [...body].filter(c => c >= 'A' && c <= 'Z').length / charCount : 0,
        body_digit_ratio: charCount ? [...body].filter(c => c >= '0' && c <= '9').length / charCount : 0,
        body_url_count: urlCount,
        body_ip_url_count: ipUrlCount,
        body_urgency_count: urgencyCount,
        body_phishing_keyword_count: phishingCount,
        body_avg_word_length: avgWordLen,
        body_entropy: entropy(body.slice(0, 500)),
    }
}

function urlColumnFeatures(urlsStr: string): Record<string, number> {
    const urlList = urlsStr.split(/\s+/).filter(u => u.startsWith('http'))
    const urlCount = urlList.length
    const hasIp = urlList.some(u => /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(u)) ? 1 : 0
    return {
        has_urls: urlCount > 0 ? 1 : 0,
        url_count: urlCount,
        url_has_ip: hasIp,
    }
}


const NGRAM_MIN = tfidfVocab.ngram_range[0]
const NGRAM_MAX = tfidfVocab.ngram_range[1]

const vocabIndex = new Map<string, { idx: number; idf: number }>(
    (tfidfVocab.ngrams as string[]).map((ng, i) => [ng, { idx: i, idf: (tfidfVocab.idf as number[])[i] }])
)

function cleanText(subject: string, body: string): string {
    let text = `${subject} ${body}`
    text = text.replace(/<[^>]+>/g, ' ')
    text = text.replace(/https?:\/\/\S+/g, ' ')
    text = text.replace(/\s+/g, ' ').trim().toLowerCase()
    return text
}

function charWbNgrams(token: string): string[] {
    const padded = ` ${token} `
    const result: string[] = []
    for (let n = NGRAM_MIN; n <= NGRAM_MAX; n++) {
        for (let i = 0; i <= padded.length - n; i++) {
            result.push(padded.slice(i, i + n))
        }
    }
    return result
}

function computeTfidf(text: string): Record<string, number> {
    const tokens = text.split(/\s+/).filter(Boolean)

    const tf: Record<string, number> = {}
    for (const token of tokens) {
        for (const ng of charWbNgrams(token)) {
            if (vocabIndex.has(ng)) tf[ng] = (tf[ng] ?? 0) + 1
        }
    }

    const tfidfRaw: Record<number, number> = {}
    for (const [ng, count] of Object.entries(tf)) {
        const entry = vocabIndex.get(ng)!
        tfidfRaw[entry.idx] = (1 + Math.log(count)) * entry.idf
    }

    const norm = Math.sqrt(Object.values(tfidfRaw).reduce((acc, v) => acc + v * v, 0))
    const features: Record<string, number> = {}
    const ngrams = tfidfVocab.ngrams as string[]
    for (const [idxStr, val] of Object.entries(tfidfRaw)) {
        const ng = ngrams[Number(idxStr)]
        features[`tfidf_${ng}`] = norm > 0 ? val / norm : 0
    }
    for (const ng of ngrams) {
        const key = `tfidf_${ng}`
        if (!(key in features)) features[key] = 0
    }
    return features
}

export interface EmailFeatures {
    [feature: string]: number
}

export function extractEmailFeatures(
    subject: string,
    body: string,
    sender: string,
    urls: string = '',
): EmailFeatures {
    const handcrafted: Record<string, number> = {
        ...senderFeatures(sender),
        ...subjectFeatures(subject),
        ...bodyFeatures(body),
        ...urlColumnFeatures(urls),
    }
    const tfidf = computeTfidf(cleanText(subject, body))
    return { ...handcrafted, ...tfidf }
}
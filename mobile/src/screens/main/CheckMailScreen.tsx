import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, useTheme, TextInput as PaperTextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import Input from '../../components/Input'
import { useAuth } from '../../contexts/AuthContext'
import { firebaseAuth } from '../../firebase/firebase'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { useNavigation } from '@react-navigation/native'
import {
    getGmailAccessToken,
    fetchGmailMessages,
    fetchMessageBody,
    GmailScopeError,
    type GmailMessage,
} from '../../api/gmail'
import { checkMail } from '../../api/checkMail'
import { useStats } from '../../contexts/StatsContext'

type ScanState =
    | { status: 'idle' }
    | { status: 'scanning' }
    | { status: 'done'; isSafe: boolean; confidence: number; uncertain: boolean }
    | { status: 'error'; message: string }

const AVATAR_COLORS = ['#1565C0', '#6A1B9A', '#00838F', '#2E7D32', '#E65100', '#AD1457', '#37474F']

function getAvatarColor(name: string): string {
    let hash = 0
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
    return AVATAR_COLORS[Math.abs(hash)]
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const CheckMailScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const { user, loading: authLoading, logout } = useAuth()
    const navigation = useNavigation<any>()
    const { recordScan } = useStats()

    const [isGoogleUser, setIsGoogleUser] = useState(false)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [emails, setEmails] = useState<GmailMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [needsReauth, setNeedsReauth] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [scanStates, setScanStates] = useState<Record<string, ScanState>>({})

    const loadEmails = useCallback(async (query?: string) => {
        console.log('[CheckMailScreen] loadEmails query:', query ?? '(none)')
        setIsLoading(true)
        setLoadError(null)
        setNeedsReauth(false)
        try {
            const token = await getGmailAccessToken()
            if (!token) {
                console.warn('[CheckMailScreen] No Gmail access token')
                setLoadError(t('emailCheck.tokenError'))
                return
            }
            setAccessToken(token)
            const messages = await fetchGmailMessages(token, query)
            console.log('[CheckMailScreen] Loaded', messages.length, 'emails')
            setEmails(messages)
            setScanStates({})
        } catch (e: any) {
            if (e instanceof GmailScopeError) {
                console.warn('[CheckMailScreen] Gmail scope missing — needsReauth')
                setNeedsReauth(true)
            } else {
                console.error('[CheckMailScreen] loadEmails error:', e?.message ?? e)
                setLoadError(e.message ?? t('emailCheck.fetchError'))
            }
        } finally {
            setIsLoading(false)
        }
    }, [t])

    useEffect(() => {
        if (authLoading) return
        const firebaseUser = firebaseAuth.currentUser
        const google = firebaseUser?.providerData.some(p => p.providerId === 'google.com') ?? false
        console.log('[CheckMailScreen] isGoogleUser:', google)
        setIsGoogleUser(google)
        if (google) loadEmails()
    }, [authLoading, loadEmails])

    const handleSearch = () => {
        console.log('[CheckMailScreen] Search:', searchQuery.trim())
        loadEmails(searchQuery.trim() || undefined)
    }

    const handleRevokeAndReauth = async () => {
        console.log('[CheckMailScreen] Revoking Google access to force fresh consent')
        try {
            await GoogleSignin.revokeAccess()
            console.log('[CheckMailScreen] Access revoked')
        } catch (e: any) {
            console.warn('[CheckMailScreen] revokeAccess error:', e?.message ?? e)
        }
        await logout()
        navigation.replace('Home')
    }

    const handleScan = async (email: GmailMessage) => {
        if (!accessToken || !user?.idToken) {
            console.warn('[CheckMailScreen] handleScan skipped — no accessToken or idToken')
            return
        }
        console.log('[CheckMailScreen] Scanning email id:', email.id, 'subject:', email.subject)
        setScanStates(prev => ({ ...prev, [email.id]: { status: 'scanning' } }))
        try {
            const body = await fetchMessageBody(accessToken, email.id)
            const result = await checkMail(
                {
                    subject: email.subject,
                    body: body || email.snippet,
                    sender: email.fromEmail || email.from,
                },
                user.idToken,
            )
            if (!result.ok) {
                console.error('[CheckMailScreen] Scan API error:', result.error)
                setScanStates(prev => ({ ...prev, [email.id]: { status: 'error', message: result.error } }))
                return
            }
            console.log('[CheckMailScreen] Scan result — isSafe:', !result.data.is_phishing, 'confidence:', result.data.confidence)
            recordScan(result.data.is_phishing)
            setScanStates(prev => ({
                ...prev,
                [email.id]: {
                    status: 'done',
                    isSafe: !result.data.is_phishing,
                    confidence: result.data.confidence,
                    uncertain: result.data.uncertain ?? false,
                },
            }))
        } catch (e: any) {
            console.error('[CheckMailScreen] handleScan exception:', e?.message ?? e)
            setScanStates(prev => ({
                ...prev,
                [email.id]: { status: 'error', message: e.message ?? t('emailCheck.scanError') },
            }))
        }
    }

    const renderScanBadge = (state: ScanState) => {
        if (state.status === 'scanning') {
            return <ActivityIndicator size="small" color={colors.primary} />
        }
        if (state.status === 'done') {
            const uncertain = state.confidence < 0.70
            const danger = !state.isSafe && !uncertain
            const bg = danger ? '#FFEBEE' : uncertain ? '#FFFDE7' : '#E8F5E9'
            const color = danger ? '#C62828' : uncertain ? '#E65100' : '#4CAF50'
            const icon = danger ? 'warning' : uncertain ? 'exclamation-circle' : 'check-circle'
            const label = danger ? t('emailCheck.warning') : uncertain ? t('emailCheck.notSure') : t('emailCheck.safe')
            return (
                <View style={[styles.badge, { backgroundColor: bg }]}>
                    <AntDesign name={icon} size={12} color={color} />
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                    <Text style={[styles.badgeConfidence, { color }]}>
                        {Math.round(state.confidence * 100)}%
                    </Text>
                </View>
            )
        }
        if (state.status === 'error') {
            return (
                <View style={[styles.badge, { backgroundColor: '#FFF3F3' }]}>
                    <AntDesign name="exclamation-circle" size={12} color="#C62828" />
                    <Text style={[styles.badgeText, { color: '#C62828' }]}>Błąd</Text>
                </View>
            )
        }
        return null
    }

    const renderEmailCard = (email: GmailMessage) => {
        const state: ScanState = scanStates[email.id] ?? { status: 'idle' }
        const avatarColor = getAvatarColor(email.from)
        const initials = getInitials(email.from)
        const isScanning = state.status === 'scanning'

        return (
            <View
                key={email.id}
                style={[styles.emailCard, { backgroundColor: colors.surface, borderColor: 'rgba(0,0,0,0.10)' }]}
            >
                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.cardMeta}>
                        <Text style={[styles.senderName, { color: colors.onBackground }]} numberOfLines={1}>
                            {email.from}
                        </Text>
                        {!!email.fromEmail && (
                            <Text style={styles.senderEmail} numberOfLines={1}>
                                {email.fromEmail}
                            </Text>
                        )}
                    </View>
                    {!!email.dateStr && (
                        <Text style={styles.dateText}>{email.dateStr}</Text>
                    )}
                </View>

                <Text style={[styles.subject, { color: colors.onBackground }]} numberOfLines={1}>
                    {email.subject}
                </Text>
                {!!email.snippet && (
                    <Text style={styles.snippet} numberOfLines={2}>
                        {email.snippet}
                    </Text>
                )}

                <View style={styles.cardBottom}>
                    {renderScanBadge(state)}
                    <Button
                        mode="outlined"
                        onPress={() => handleScan(email)}
                        disabled={isScanning || state.status === 'done'}
                        style={styles.scanBtn}
                        contentStyle={styles.scanBtnContent}
                        labelStyle={[styles.scanBtnLabel, { color: colors.primary }]}
                        compact
                    >
                        {isScanning ? t('emailCheck.scanning') : t('emailCheck.scanButton')}
                    </Button>
                </View>
            </View>
        )
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading && emails.length > 0}
                        onRefresh={() => loadEmails(searchQuery.trim() || undefined)}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.headerSection}>
                    <Text style={[styles.title, { color: colors.onBackground }]}>
                        {t('emailCheck.title')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.onBackground }]}>
                        {t('emailCheck.subtitle')}
                    </Text>
                </View>

                <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: 'rgba(0,0,0,0.12)' }]}>
                    <Input
                        mode="outlined"
                        style={styles.searchInput}
                        placeholder={t('emailCheck.searchPlaceholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        icon={<PaperTextInput.Icon icon="magnify" />}
                    />
                    <Button
                        style={{ backgroundColor: colors.primary, borderRadius: 12 }}
                        onPress={handleSearch}
                        disabled={isLoading}
                        contentStyle={{ padding: 10 }}
                    >
                        <Text style={styles.searchBtnText}>
                            {isLoading ? t('emailCheck.loading') : t('emailCheck.searchButton')}
                        </Text>
                    </Button>
                </View>

                {!isGoogleUser && (
                    <View style={[styles.noGoogleCard, { backgroundColor: colors.surface, borderColor: 'rgba(0,0,0,0.12)' }]}>
                        <MaterialCommunityIcons name="google" size={36} color="#4285F4" />
                        <View style={styles.noGoogleText}>
                            <Text style={[styles.noGoogleTitle, { color: colors.onBackground }]}>
                                {t('emailCheck.noGoogle')}
                            </Text>
                            <Text style={styles.noGoogleDesc}>
                                {t('emailCheck.noGoogleDesc')}
                            </Text>
                        </View>
                    </View>
                )}

                {isGoogleUser && needsReauth && (
                    <View style={[styles.reauthCard, { backgroundColor: '#FFF8E1', borderColor: '#F9A825' }]}>
                        <AntDesign name="key" size={28} color="#F9A825" />
                        <View style={styles.reauthText}>
                            <Text style={[styles.reauthTitle, { color: colors.onBackground }]}>
                                {t('emailCheck.reauthTitle')}
                            </Text>
                            <Text style={styles.reauthDesc}>
                                {t('emailCheck.reauthDesc')}
                            </Text>
                            <Button
                                mode="contained"
                                onPress={handleRevokeAndReauth}
                                style={styles.reauthBtn}
                                labelStyle={styles.reauthBtnLabel}
                                buttonColor="#F9A825"
                                compact
                            >
                                {t('emailCheck.reauthButton')}
                            </Button>
                        </View>
                    </View>
                )}

                {isGoogleUser && loadError && (
                    <View style={[styles.errorCard, { backgroundColor: '#FFF3F3', borderColor: '#C62828' }]}>
                        <AntDesign name="exclamation-circle" size={20} color="#C62828" />
                        <Text style={styles.errorText}>{loadError}</Text>
                    </View>
                )}

                {isGoogleUser && isLoading && emails.length === 0 && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.onBackground }]}>
                            {t('emailCheck.loading')}
                        </Text>
                    </View>
                )}

                {isGoogleUser && !isLoading && emails.length === 0 && !loadError && (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="email-off-outline" size={48} color={colors.onBackground} style={{ opacity: 0.3 }} />
                        <Text style={[styles.emptyText, { color: colors.onBackground }]}>
                            {t('emailCheck.noEmails')}
                        </Text>
                    </View>
                )}

                {emails.length > 0 && (
                    <View style={styles.emailsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                                {t('emailCheck.inbox')}
                            </Text>
                            <TouchableOpacity onPress={() => loadEmails(searchQuery.trim() || undefined)} disabled={isLoading}>
                                <MaterialCommunityIcons
                                    name="refresh"
                                    size={20}
                                    color={isLoading ? 'rgba(0,0,0,0.3)' : colors.primary}
                                />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.emailsList}>
                            {emails.map(renderEmailCard)}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 20,
    },
    headerSection: {
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        fontWeight: '500',
        lineHeight: 20,
    },
    searchCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    searchInput: {
        fontSize: 14,
    },
    searchBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    noGoogleCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    noGoogleText: {
        flex: 1,
    },
    noGoogleTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    noGoogleDesc: {
        fontSize: 13,
        color: '#777',
        lineHeight: 18,
    },
    errorCard: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#C62828',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 14,
    },
    loadingText: {
        fontSize: 14,
        opacity: 0.6,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.4,
    },
    emailsSection: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    emailsList: {
        gap: 10,
    },
    emailCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    cardMeta: {
        flex: 1,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '700',
    },
    senderEmail: {
        fontSize: 11,
        color: '#888',
        marginTop: 1,
    },
    dateText: {
        fontSize: 11,
        color: '#aaa',
        flexShrink: 0,
    },
    subject: {
        fontSize: 13,
        fontWeight: '600',
    },
    snippet: {
        fontSize: 12,
        color: '#888',
        lineHeight: 17,
    },
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 6,
        gap: 10,
    },
    scanBtn: {
        borderRadius: 8,
    },
    scanBtnContent: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    scanBtnLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    badgeConfidence: {
        fontSize: 10,
        fontWeight: '600',
    },
    reauthCard: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    reauthText: {
        flex: 1,
    },
    reauthTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    reauthDesc: {
        fontSize: 13,
        color: '#888',
        lineHeight: 18,
        marginBottom: 12,
    },
    reauthBtn: {
        alignSelf: 'flex-start',
        borderRadius: 8,
    },
    reauthBtnLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: 'white',
    },
})

export default CheckMailScreen

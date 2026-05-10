import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Button } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { firebaseAuth } from '../../firebase/firebase'
import { reload } from 'firebase/auth'
import { useAuth } from '../../contexts/AuthContext'
import { useStats } from '../../contexts/StatsContext'
import type { User } from 'firebase/auth'

const AVATAR_BG = '#1565C0'

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

const UserProfileScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<any>()
    const { logout } = useAuth()
    const { stats } = useStats()

    const [fbUser, setFbUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const current = firebaseAuth.currentUser
        if (!current) {
            setLoading(false)
            return
        }
        reload(current)
            .then(() => setFbUser(firebaseAuth.currentUser))
            .catch(() => setFbUser(current))
            .finally(() => setLoading(false))
    }, [])

    const handleSignOut = async () => {
        await logout()
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
    }

    const isGoogleUser = fbUser?.providerData.some(p => p.providerId === 'google.com') ?? false
    const displayName  = fbUser?.displayName ?? '—'
    const email        = fbUser?.email ?? '—'
    const photoURL     = fbUser?.photoURL ?? null
    const memberSince  = formatDate(fbUser?.metadata?.creationTime)
    const lastSignIn   = formatDate(fbUser?.metadata?.lastSignInTime)
    const safeRate     = stats.scanned > 0
        ? Math.round((stats.scanned - stats.threats) / stats.scanned * 100)
        : 100

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Button
                        onPress={() => navigation.goBack()}
                        icon="arrow-left"
                        textColor={colors.primary}
                        compact
                    >
                        {t('profile.back', 'Back')}
                    </Button>
                    <Text style={[styles.screenTitle, { color: colors.onBackground }]}>
                        {t('profile.title', 'My Profile')}
                    </Text>
                    <View style={{ width: 72 }} />
                </View>
                <View style={styles.avatarSection}>
                    {photoURL ? (
                        <Image source={{ uri: photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: AVATAR_BG, alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                        </View>
                    )}
                    <Text style={[styles.displayName, { color: colors.onBackground }]}>{displayName}</Text>
                    <View style={[styles.providerBadge, { backgroundColor: isGoogleUser ? '#E8F0FE' : '#F3E5F5' }]}>
                        {isGoogleUser
                            ? <MaterialCommunityIcons name="google" size={14} color="#1A73E8" />
                            : <Ionicons name="mail-outline" size={14} color="#7B1FA2" />
                        }
                        <Text style={[styles.providerText, { color: isGoogleUser ? '#1A73E8' : '#7B1FA2' }]}>
                            {isGoogleUser ? 'Google account' : 'Email account'}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.sectionLabel, { color: colors.onBackground }]}>
                    {t('profile.accountInfo', 'Account Information')}
                </Text>
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <InfoRow icon="mail-outline" label={t('profile.email', 'Email')} value={email} colors={colors} />
                    <Divider colors={colors} />
                    <InfoRow icon="calendar-outline" label={t('profile.memberSince', 'Member since')} value={memberSince} colors={colors} />
                    <Divider colors={colors} />
                    <InfoRow icon="time-outline" label={t('profile.lastSignIn', 'Last sign in')} value={lastSignIn} colors={colors} />
                    <Divider colors={colors} />
                    <InfoRow
                        icon="shield-checkmark-outline"
                        label={t('profile.emailVerified', 'Email verified')}
                        value={fbUser?.emailVerified ? t('profile.yes', 'Yes') : t('profile.no', 'No')}
                        valueColor={fbUser?.emailVerified ? '#43A047' : '#E53935'}
                        colors={colors}
                    />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.onBackground }]}>
                    {t('profile.scanActivity', 'Scan Activity')}
                </Text>
                <View style={styles.statsRow}>
                    <StatCard
                        value={stats.scanned}
                        label={t('profile.totalScans', 'Total scans')}
                        iconName="scan-outline"
                        iconColor={colors.primary}
                        colors={colors}
                    />
                    <StatCard
                        value={stats.threats}
                        label={t('profile.threats', 'Threats found')}
                        iconName="warning-outline"
                        iconColor="#E53935"
                        colors={colors}
                    />
                    <StatCard
                        value={`${safeRate}%`}
                        label={t('profile.safeRate', 'Safe rate')}
                        iconName="shield-outline"
                        iconColor="#43A047"
                        colors={colors}
                    />
                </View>
                <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    icon="logout"
                    textColor={colors.error}
                    style={[styles.signOutBtn, { borderColor: colors.error }]}
                    contentStyle={{ flexDirection: 'row-reverse' }}
                >
                    {t('menu.logout', 'Sign Out')}
                </Button>

            </ScrollView>
        </SafeAreaView>
    )
}

function InfoRow({ icon, label, value, valueColor, colors }: {
    icon: string; label: string; value: string
    valueColor?: string; colors: any
}) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon as any} size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: colors.onSurface, opacity: 0.6 }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: valueColor ?? colors.onSurface }]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    )
}

function Divider({ colors }: { colors: any }) {
    return <View style={[styles.divider, { backgroundColor: colors.onSurface, opacity: 0.08 }]} />
}

function StatCard({ value, label, iconName, iconColor, colors }: {
    value: number | string; label: string
    iconName: string; iconColor: string; colors: any
}) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name={iconName as any} size={22} color={iconColor} />
            <Text style={[styles.statValue, { color: colors.onSurface }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.onSurface }]}>{label}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    avatarSection: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 10,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    avatarInitials: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
    },
    displayName: {
        fontSize: 22,
        fontWeight: '800',
    },
    providerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    providerText: {
        fontSize: 12,
        fontWeight: '600',
    },

    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
        marginBottom: -8,
    },

    card: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    infoIcon: { marginRight: 12 },
    infoLabel: { flex: 1, fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: '600', maxWidth: 180, textAlign: 'right' },
    divider: { height: 1, marginHorizontal: 16 },

    statsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        opacity: 0.5,
        textAlign: 'center',
    },

    signOutBtn: {
        borderRadius: 12,
        marginTop: 8,
    },
})

export default UserProfileScreen
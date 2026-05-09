import React from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { useAuth } from '../contexts/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'

const { height, width } = Dimensions.get('window')

const MainScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const { user } = useAuth()
    const stats = {
        scanned: 342,
        threats: 18,
        safePercentage: 95,
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.greetingSection}>
                    <Text style={[styles.greetingTitle, { color: colors.onBackground }]}>
                        {t('dashboard.greeting', { name: user?.name || 'User' })}
                    </Text>
                    <Text style={[styles.greetingSubtitle, { color: colors.onBackground }]}>
                        {t('dashboard.protection')}
                    </Text>
                </View>
                <View style={styles.cardsContainer}>
                    <TouchableOpacity
                        style={[styles.scanCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconView, { backgroundColor: colors.primary }]}>
                                <MaterialCommunityIcons name="link" size={28} color="white" />
                            </View>
                            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.onBackground }]}>
                            {t('dashboard.scanUrl')}
                        </Text>
                        <Text style={[styles.cardDesc, { color: colors.onBackground }]}>
                            {t('dashboard.scanUrlDesc')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.scanCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconView, { backgroundColor: colors.secondary }]}>
                                <MaterialCommunityIcons name="email-outline" size={28} color="white" />
                            </View>
                            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.onBackground }]}>
                            {t('dashboard.scanEmail')}
                        </Text>
                        <Text style={[styles.cardDesc, { color: colors.onBackground }]}>
                            {t('dashboard.scanEmailDesc')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.statsHeader}>
                    <Text style={[styles.statsTitle, { color: colors.onBackground }]}>
                        {t('dashboard.yourStats')}
                    </Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {stats.scanned}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.onBackground }]}>
                            {t('dashboard.scanned')}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: 'rgba(198, 40, 40, 0.1)', borderColor: 'rgba(198, 40, 40, 0.3)' }]}>
                        <View style={styles.threatsContent}>
                            <AntDesign name="warning" size={20} color="#C62828" style={styles.threatsIcon} />
                            <Text style={styles.statValueThreats}>
                                {stats.threats}
                            </Text>
                        </View>
                        <Text style={[styles.statLabel, { color: colors.onBackground }]}>
                            {t('dashboard.threats')}
                        </Text>
                    </View>
                </View>
                <View style={[styles.securityCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}>
                    <Text style={[styles.securityTitle, { color: colors.onBackground }]}>
                        {t('dashboard.securityLevel')}
                    </Text>
                    <View style={styles.securityContent}>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBackground}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${stats.safePercentage}%`,
                                            backgroundColor: colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={styles.percentageCircle}>
                            <Text style={[styles.percentageText, { color: colors.primary }]}>
                                {stats.safePercentage}%
                            </Text>
                            <Text style={[styles.percentageLabel, { color: colors.onBackground }]}>
                                {t('dashboard.safe')}
                            </Text>
                        </View>
                    </View>
                </View>
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
    greetingSection: {
        marginBottom: 8,
        paddingTop: 8,
    },
    greetingTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 6,
    },
    greetingSubtitle: {
        fontSize: 14,
        opacity: 0.7,
        fontWeight: '500',
    },
    statsHeader: {
        marginBottom: 4,
        marginTop: 8,
    },
    statsTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    cardsContainer: {
        gap: 16,
    },
    scanCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 22,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 21,
        fontWeight: '700',
        marginBottom: 6,
    },
    cardDesc: {
        fontSize: 13,
        opacity: 0.7,
        lineHeight: 18,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 130,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    statValueThreats: {
        fontSize: 28,
        fontWeight: '800',
        color: '#C62828',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    securityCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    securityTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    securityContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    progressContainer: {
        flex: 1,
    },
    progressBackground: {
        height: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    percentageCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentageText: {
        fontSize: 20,
        fontWeight: '800',
    },
    percentageLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    iconView: {
        height: 50,
        width: 50,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    threatsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    threatsIcon: {
        marginRight: 6,
        marginBottom: 6
    },
})

export default MainScreen

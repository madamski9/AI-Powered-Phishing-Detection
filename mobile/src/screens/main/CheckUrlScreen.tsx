import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { MaterialCommunityIcons, AntDesign, EvilIcons } from '@expo/vector-icons'
import { Button, useTheme } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import Input from '../../components/Input'

const { width } = Dimensions.get('window')

interface UrlScanResult {
    id: string
    url: string
    isSafe: boolean
    timestamp: Date
}

const truncateUrl = (url: string, maxLength: number = 35): string => {
    if (url.length > maxLength) {
        return url.substring(0, maxLength - 3) + '...'
    }
    return url
}

const CheckUrlScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const [url, setUrl] = useState('')
    const [isScanning, setIsScanning] = useState(false)

    const [recentScans] = useState<UrlScanResult[]>([
        {
            id: '1',
            url: 'https://www.google.com',
            isSafe: true,
            timestamp: new Date(),
        },
        {
            id: '2',
            url: 'https://suspicious-login-bank-phishing-attempt.com',
            isSafe: false,
            timestamp: new Date(Date.now() - 3600000),
        },
        {
            id: '3',
            url: 'https://github.com',
            isSafe: true,
            timestamp: new Date(Date.now() - 7200000),
        },
        {
            id: '4',
            url: 'https://verify-your-account-urgently-fake-security-warning.net',
            isSafe: false,
            timestamp: new Date(Date.now() - 10800000),
        },
        {
            id: '5',
            url: 'https://stackoverflow.com',
            isSafe: true,
            timestamp: new Date(Date.now() - 14400000),
        },
    ])

    const handleScan = async () => {
        if (!url.trim()) {
            console.warn('URL is empty')
            return
        }

        setIsScanning(true)
        try {
            // TODO: Call API to scan URL
            console.log('Scanning URL:', url)
            await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
            console.error('Error scanning URL:', error)
        } finally {
            setIsScanning(false)
        }
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerSection}>
                    <Text style={[styles.title, { color: colors.onBackground }]}>
                        {t('urlCheck.title')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.onBackground }]}>
                        {t('urlCheck.subtitle')}
                    </Text>
                </View>
                <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}>
                    <View style={styles.inputHeader}>
                        <View style={[styles.iconView, { backgroundColor: colors.primary }]}>
                            <MaterialCommunityIcons name="link" size={28} color="white" />
                        </View>
                    </View>
                    <Input
                        mode='outlined'
                        style={[styles.urlInput, { color: colors.onBackground }]}
                        placeholder={t('urlCheck.inputPlaceholder')}
                        value={url}
                        onChangeText={setUrl}
                    />

                    <Button
                        style={[styles.scanButton, { backgroundColor: colors.primary }]}
                        onPress={handleScan}
                        disabled={isScanning}
                        icon="search"
                    >
                        <Text style={styles.scanButtonText}>
                            {isScanning ? 'Skanowanie...' : t('urlCheck.scanButton')}
                        </Text>
                    </Button>
                </View>
                <View style={styles.recentScansSection}>
                    <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                        {t('urlCheck.recentScans')}
                    </Text>
                    <View style={styles.scansList}>
                        {recentScans.map((scan) => (
                            <View
                                key={scan.id}
                                style={[
                                    styles.scanItem,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: 'rgba(0, 0, 0, 0.12)',
                                    },
                                ]}
                            >
                                <View style={styles.scanItemLeft}>
                                    {scan.isSafe ? (
                                        <AntDesign name="check-circle" size={24} color="#4CAF50" />
                                    ) : (
                                        <AntDesign name="warning" size={24} color="#C62828" />
                                    )}
                                </View>
                                <View style={styles.scanItemCenter}>
                                    <Text
                                        style={[
                                            styles.scanItemUrl,
                                            { color: colors.onBackground },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {truncateUrl(scan.url)}
                                    </Text>
                                </View>
                                <View style={styles.scanItemRight}>
                                    <Text
                                        style={[
                                            styles.scanItemStatus,
                                            {
                                                color: scan.isSafe ? '#4CAF50' : '#C62828',
                                            },
                                        ]}
                                    >
                                        {scan.isSafe
                                            ? t('urlCheck.safe')
                                            : t('urlCheck.warning')}
                                    </Text>
                                </View>
                            </View>
                        ))}
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
    inputCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    inputHeader: {
        marginBottom: 16,
    },
    iconView: {
        height: 50,
        width: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    urlInput: {
        fontSize: 14,
        marginBottom: 16,
    },
    scanButton: {
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanButtonIcon: {
        marginRight: 8,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    recentScansSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        opacity: 0.8,
        marginBottom: 20,
        marginTop: 10
    },
    scansList: {
        gap: 10,
    },
    scanItem: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    scanItemLeft: {
        flexShrink: 0,
    },
    scanItemCenter: {
        flex: 1,
        marginHorizontal: 4,
    },
    scanItemUrl: {
        fontSize: 13,
        fontWeight: '500',
    },
    scanItemRight: {
        flexShrink: 0,
    },
    scanItemStatus: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
})

export default CheckUrlScreen

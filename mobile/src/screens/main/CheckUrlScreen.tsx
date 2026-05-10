import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { AntDesign } from '@expo/vector-icons'
import { Button, useTheme, TextInput as PaperTextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Input from '../../components/Input'
import SwipeableRow from '../../components/SwipeableRow'
import { useAuth } from '../../contexts/AuthContext'
import { useStats } from '../../contexts/StatsContext'
import { checkUrl } from '../../api/checkUrl'

const SCANS_STORAGE_KEY = '@url_scans'
const MAX_STORED_SCANS = 25

const { height, width } = Dimensions.get('window')

interface UrlScanResult {
    id: string
    url: string
    isSafe: boolean
    confidence: number
    timestamp: Date
}

const truncateUrl = (url: string, maxLength: number = 35): string => {
    if (url.length > maxLength) {
        return url.substring(0, maxLength - 3) + '...'
    }
    return url
}

const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9À-ɏ]([a-zA-Z0-9À-ɏ\-]{0,61}[a-zA-Z0-9À-ɏ])?\.)+[a-zA-Z]{2,}(:\d{1,5})?(\/[^\s]*)?$/

const validateUrl = (input: string): string | null => {
    if (/\s/.test(input)) return 'URL nie może zawierać spacji'
    if (!URL_REGEX.test(input)) return 'Nieprawidłowy format URL'
    return null
}

const CheckUrlScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const { user } = useAuth()
    const { recordScan } = useStats()
    const [url, setUrl] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<UrlScanResult | null>(null)
    const [scanError, setScanError] = useState<string | null>(null)
    const [recentScans, setRecentScans] = useState<UrlScanResult[]>([])

    useEffect(() => {
        AsyncStorage.getItem(SCANS_STORAGE_KEY).then(raw => {
            if (!raw) return
            try {
                const parsed: UrlScanResult[] = JSON.parse(raw).map((s: any) => ({
                    ...s,
                    timestamp: new Date(s.timestamp),
                }))
                setRecentScans(parsed)
            } catch {
                // corrupted storage — ignore
            }
        })
    }, [])

    const handleScan = async () => {
        if (!url.trim()) {
            console.warn('[CheckUrlScreen] URL is empty')
            return
        }
        const validationError = validateUrl(url.trim())
        if (validationError) {
            setScanError(validationError)
            return
        }
        if (!user?.idToken) {
            console.warn('[CheckUrlScreen] No idToken - user not authenticated')
            return
        }

        console.log('[CheckUrlScreen] Starting scan for:', url.trim())
        setIsScanning(true)
        setScanResult(null)
        setScanError(null)

        const result = await checkUrl(url.trim(), user.idToken)

        if (!result.ok) {
            console.error('[CheckUrlScreen] Scan failed:', result.error)
            setScanError(result.error)
            setIsScanning(false)
            return
        }

        console.log('[CheckUrlScreen] Scan complete - is_phishing:', result.data.is_phishing, 'confidence:', result.data.confidence)

        const newScan: UrlScanResult = {
            id: Date.now().toString(),
            url: url.trim(),
            isSafe: !result.data.is_phishing,
            confidence: result.data.confidence,
            timestamp: new Date(),
        }

        recordScan(result.data.is_phishing)
        setScanResult(newScan)
        setRecentScans(prev => {
            const updated = [newScan, ...prev].slice(0, MAX_STORED_SCANS)
            AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
        setUrl('')
        setIsScanning(false)
    }

    const deleteScan = (id: string) => {
        setRecentScans(prev => {
            const updated = prev.filter(s => s.id !== id)
            AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
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
                    <Input
                        mode='outlined'
                        style={[styles.urlInput, { color: colors.onBackground }]}
                        placeholder={t('urlCheck.inputPlaceholder')}
                        value={url}
                        onChangeText={setUrl}
                        icon={<PaperTextInput.Icon icon="link" style={{ marginRight: 10 }} />}
                    />
                    <Button
                        style={{ backgroundColor: colors.primary, borderRadius: 12 }}
                        onPress={handleScan}
                        disabled={isScanning || !url.trim()}
                        contentStyle={{ padding: 10 }}
                    >
                        <Text style={styles.scanButtonText}>
                            {isScanning ? 'Skanowanie...' : t('urlCheck.scanButton')}
                        </Text>
                    </Button>
                </View>

                {scanError && (
                    <View style={[styles.resultCard, { backgroundColor: '#FFF3F3', borderColor: '#C62828' }]}>
                        <AntDesign name="exclamation-circle" size={24} color="#C62828" />
                        <View style={styles.resultTextWrapper}>
                            <Text style={[styles.resultLabel, { color: '#C62828' }]}>Błąd skanowania</Text>
                            <Text style={styles.resultDetail}>{scanError}</Text>
                        </View>
                    </View>
                )}
                {scanResult && (() => {
                    const uncertain = scanResult.confidence < 0.70
                    const danger = !scanResult.isSafe && !uncertain
                    const bg = danger ? '#FFF3F3' : uncertain ? '#FFFDE7' : '#F1FFF4'
                    const border = danger ? '#C62828' : uncertain ? '#F9A825' : '#4CAF50'
                    const color = danger ? '#C62828' : uncertain ? '#E65100' : '#4CAF50'
                    const icon = danger ? 'warning' : uncertain ? 'exclamation-circle' : 'check-circle'
                    const label = danger ? t('urlCheck.warning') : uncertain ? t('urlCheck.notSure') : t('urlCheck.safe')
                    return (
                        <View style={[styles.resultCard, { backgroundColor: bg, borderColor: border }]}>
                            <AntDesign name={icon} size={28} color={color} />
                            <View style={styles.resultTextWrapper}>
                                <Text style={[styles.resultLabel, { color }]}>{label}</Text>
                                <Text style={styles.resultDetail} numberOfLines={1}>
                                    {truncateUrl(scanResult.url)}
                                </Text>
                                {uncertain && (
                                    <Text style={[styles.resultDetail, { color: '#E65100' }]}>
                                        {t('urlCheck.notSureHint')}
                                    </Text>
                                )}
                                <Text style={styles.resultConfidence}>
                                    Pewność: {Math.round(scanResult.confidence * 100)}%
                                </Text>
                            </View>
                        </View>
                    )
                })()}
                {recentScans.length > 0 && (
                    <View style={styles.recentScansSection}>
                        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                            {t('urlCheck.recentScans')}
                        </Text>
                        <View style={styles.scansList}>
                            {recentScans.map((scan) => (
                                <SwipeableRow key={scan.id} onDelete={() => deleteScan(scan.id)}>
                                <View
                                    style={[
                                        styles.scanItem,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: 'rgba(0, 0, 0, 0.12)',
                                        },
                                    ]}
                                >
                                    <View style={styles.scanItemLeft}>
                                        {(!scan.isSafe && scan.confidence >= 0.70)
                                            ? <AntDesign name="warning" size={24} color="#C62828" />
                                            : scan.confidence < 0.70
                                                ? <AntDesign name="exclamation-circle" size={24} color="#F9A825" />
                                                : <AntDesign name="check-circle" size={24} color="#4CAF50" />
                                        }
                                    </View>
                                    <View style={styles.scanItemCenter}>
                                        <Text
                                            style={[styles.scanItemUrl, { color: colors.onBackground }]}
                                            numberOfLines={1}
                                        >
                                            {truncateUrl(scan.url)}
                                        </Text>
                                        <Text style={styles.scanItemConfidence}>
                                            {Math.round(scan.confidence * 100)}% pewności
                                        </Text>
                                    </View>
                                    <View style={styles.scanItemRight}>
                                        <Text style={[styles.scanItemStatus, {
                                            color: (!scan.isSafe && scan.confidence >= 0.70) ? '#C62828' : scan.confidence < 0.70 ? '#E65100' : '#4CAF50'
                                        }]}>
                                            {(!scan.isSafe && scan.confidence >= 0.70) ? t('urlCheck.warning') : scan.confidence < 0.70 ? t('urlCheck.notSure') : t('urlCheck.safe')}
                                        </Text>
                                    </View>
                                </View>
                                </SwipeableRow>
                            ))}
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
    urlInput: {
        fontSize: 14,
        marginBottom: 16,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    resultCard: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    resultTextWrapper: {
        flex: 1,
    },
    resultLabel: {
        fontSize: 16,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultDetail: {
        fontSize: 13,
        color: '#555',
        marginTop: 2,
    },
    resultConfidence: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
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
        marginTop: 10,
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
    scanItemConfidence: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
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

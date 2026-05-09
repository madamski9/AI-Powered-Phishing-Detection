import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { AntDesign } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import Input from '../components/Input'
import GoogleLoginButton from '../components/GoogleLoginButton'
import EmailButton from '../components/EmailLoginButton'

const { height, width } = Dimensions.get('window')
const HomeScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const [payload, setPayload] = useState({
        "email": "",
        "password": ""
    })
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 30}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <View style={styles.hero}>
                            <View style={[styles.shieldWrap, { borderColor: colors.primary }]}>
                                <AntDesign name="safety" size={63} color="black" />
                            </View>
                            <Text style={[styles.title, { color: colors.onBackground }]}>
                                {t('auth.phishingDetector')}
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.onBackground }]}>
                                {t('auth.protectYourDigitalPresence')}
                            </Text>
                        </View>
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}>
                            <GoogleLoginButton />
                            <View style={styles.separatorRow}>
                                <View style={styles.separatorLine} />
                                <Text style={[styles.separatorText, { color: colors.onSurface }]}>{t('auth.or')}</Text>
                                <View style={styles.separatorLine} />
                            </View>
                            <View style={styles.emailSection}>
                                <Input
                                    style={[styles.input, { backgroundColor: "white" }]}
                                    mode='outlined'
                                    placeholder={t('auth.emailAddress')}
                                    value={payload.email}
                                    onChangeText={(text) => setPayload({ ...payload, email: text })}
                                />
                                <Input
                                    style={[styles.input, { backgroundColor: "white" }]}
                                    mode='outlined'
                                    secure={true}
                                    placeholder={t('auth.password')}
                                    value={payload.password}
                                    onChangeText={(text) => setPayload({ ...payload, password: text })}
                                />
                                <EmailButton email={ payload.email } password={ payload.password } />
                            </View>
                        </View>
                        <Text style={[styles.footer, { color: colors.onBackground }]}>
                            {t('auth.termsAndPrivacy')}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 28,
        justifyContent: 'center',
    },
    content: {
        width: '100%',
        alignItems: 'center',
        gap: 24,
    },
    hero: {
        width: '100%',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    shieldWrap: {
        backgroundColor: "white",
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        opacity: 0.8,
    },
    card: {
        width: width * 0.93,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 30,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    separatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 30,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.12)',
    },
    separatorText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    emailSection: {
        width: '100%',
        gap: 12,
    },
    footer: {
        width: width * 0.7,
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 18,
        opacity: 0.78,
        paddingHorizontal: 6,
    },
    input: {
        width: width * 0.83,
        height: 51
    },
})

export default HomeScreen
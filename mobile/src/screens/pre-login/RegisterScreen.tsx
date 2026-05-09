import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme, Button } from 'react-native-paper'
import { AntDesign } from '@expo/vector-icons'
import Input from '../../components/Input'
import { useAuth } from '../../contexts/AuthContext'
import { AuthStatus } from '../../enum/authStatus'

const { width } = Dimensions.get('window')

const RegisterScreen = () => {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<any>()
    const { signUpWithEmailPassword, loading, error, clearError } = useAuth()
    const [payload, setPayload] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
    })

    const handleRegister = async () => {
        if (!payload.email || !payload.email.includes('@')) {
            return
        }

        if (!payload.password || payload.password !== payload.confirmPassword) {
            return
        }

        const result = await signUpWithEmailPassword(payload.email, payload.password, payload.name || undefined)
        if (result.status === AuthStatus.LOGGED_IN) {
            navigation.replace('Main' as never)
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <View style={styles.hero}>
                            <View style={[styles.shieldWrap, { borderColor: colors.primary }]}>
                                <AntDesign name="user-add" size={58} color="black" />
                            </View>
                            <Text style={[styles.title, { color: colors.onBackground }]}>
                                {t('auth.registerTitle')}
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.onBackground }]}>
                                {t('auth.registerSubtitle')}
                            </Text>
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.12)' }]}>
                            <View style={styles.formSection}>
                                <Input
                                    style={[styles.input, { backgroundColor: 'white' }]}
                                    mode="outlined"
                                    placeholder={t('auth.name')}
                                    value={payload.name}
                                    onChangeText={(text) => {
                                        clearError()
                                        setPayload({ ...payload, name: text })
                                    }}
                                />
                                <Input
                                    style={[styles.input, { backgroundColor: 'white' }]}
                                    mode="outlined"
                                    placeholder={t('auth.emailAddress')}
                                    value={payload.email}
                                    onChangeText={(text) => {
                                        clearError()
                                        setPayload({ ...payload, email: text })
                                    }}
                                />
                                <Input
                                    style={[styles.input, { backgroundColor: 'white' }]}
                                    mode="outlined"
                                    secure={true}
                                    placeholder={t('auth.password')}
                                    value={payload.password}
                                    onChangeText={(text) => {
                                        clearError()
                                        setPayload({ ...payload, password: text })
                                    }}
                                />
                                <Input
                                    style={[styles.input, { backgroundColor: 'white' }]}
                                    mode="outlined"
                                    secure={true}
                                    placeholder={t('auth.confirmPassword')}
                                    value={payload.confirmPassword}
                                    onChangeText={(text) => {
                                        clearError()
                                        setPayload({ ...payload, confirmPassword: text })
                                    }}
                                />

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <Button
                                    mode="contained"
                                    onPress={handleRegister}
                                    loading={loading}
                                    disabled={loading}
                                    contentStyle={{ paddingVertical: 8 }}
                                    style={styles.button}
                                >
                                    {t('auth.register')}
                                </Button>

                                <TouchableOpacity onPress={() => navigation.replace('Home' as never)}>
                                    <Text style={[styles.loginLink, { color: colors.primary }]}>
                                        {t('auth.haveAccountLogin')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
        backgroundColor: 'white',
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
    formSection: {
        width: '100%',
        gap: 12,
    },
    input: {
        width: width * 0.83,
        height: 51,
    },
    button: {
        marginTop: 4,
        borderRadius: 12,
    },
    loginLink: {
        marginTop: 4,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        opacity: 0.9,
    },
    errorText: {
        color: '#C62828',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
})

export default RegisterScreen
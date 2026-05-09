import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import Input from '../components/Input'

const { width } = Dimensions.get('window')
const HomeScreen = () => {
    const [payload, setPayload] = useState({
        "email": "",
        "password": ""
    })
    console.log(payload)
    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <Text style={styles.title}>
                            Phishing Detector
                        </Text>
                        <Input
                            mode='outlined'
                            placeholder="Email"
                            value={payload.email}
                            onChangeText={(text) => setPayload({ ...payload, email: text })}
                        />
                        <Input
                            mode='outlined'
                            placeholder="Password"
                            value={payload.password}
                            onChangeText={(text) => setPayload({ ...payload, password: text })}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: width,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        width: width,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
})

export default HomeScreen
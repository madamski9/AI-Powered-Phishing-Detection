import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, Text, Button } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { AuthStatus } from "../enum/authStatus";
import { useThemeContext } from "../contexts/ThemeContext";

const { width, height } = Dimensions.get("window");
interface EmailProps {
    email: string,
    password: string
}
const EmailButton = ({ email, password }: EmailProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const { signInWithEmailPassword } = useAuth();
  const navigation = useNavigation<any>();
  const { isDarkMode } = useThemeContext()

  const handleEmailAuth = async () => {
    if (!email || !email.includes('@')) {
      console.warn('Invalid email');
      return;
    }

    if (!password) {
      console.warn('Missing password');
      return;
    }
    setIsSubmiting(true);
    try {
      const response = await signInWithEmailPassword(email, password);
      if (response.status !== AuthStatus.ERROR) {
        navigation.replace("Main");
      }
    } catch (error) {
      console.error("Email login error:", error);
    } finally {
      setIsSubmiting(false);
    }
  };

  return (
    <Button
      mode="contained"
      contentStyle={{ flexDirection: "row", justifyContent: "center" }}
      labelStyle={{ color: "white", fontSize: 16, fontWeight: "600" }}
      style={[
        styles.googleButton,
        { backgroundColor: colors.secondary },
      ]}
      onPress={handleEmailAuth}
      disabled={isSubmiting}
      loading={isSubmiting}
    >
        <Text style={[styles.text, { color: isDarkMode ? "white" :  colors.onSecondary }]}>
            {isSubmiting
                ? t("auth.continuingWithEmail")
                : t("auth.continueWithEmail")}
        </Text>
    </Button>
  );
};

export default EmailButton;

const styles = StyleSheet.create({
  googleButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 5
  },
  text: {
    fontWeight: 600,
    fontSize: 15
  }
});
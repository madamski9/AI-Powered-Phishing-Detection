import React, { useState } from "react";
import {
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, Text, Button } from "react-native-paper";
import { AntDesign } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";

const GoogleButton = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleAuth = async () => {
    setIsSubmiting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google login error:", error);
    } finally {
      setIsSubmiting(false);
    }
  };

  return (
    <Button
      mode="contained"
      icon={() => <AntDesign name="google" size={23} color="white" style={{ marginRight: 8 }} />}
      contentStyle={{ flexDirection: "row", justifyContent: "center" }}
      labelStyle={{ color: "white", fontSize: 16, fontWeight: "600" }}
      style={[
        styles.googleButton,
        { backgroundColor: colors.primary },
      ]}
      onPress={handleGoogleAuth}
      disabled={isSubmiting}
      loading={isSubmiting}
    >
        <Text style={styles.text}>
            {isSubmiting
                ? t("auth.signingInWithGoogle")
                : t("auth.signInWithGoogle")}
        </Text>
    </Button>
  );
};

export default GoogleButton;

const styles = StyleSheet.create({
  googleButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    color: "white",
    fontWeight: 600,
    fontSize: 15
  }
});

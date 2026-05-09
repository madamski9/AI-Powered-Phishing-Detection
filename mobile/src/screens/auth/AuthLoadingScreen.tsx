import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../../firebase/firebase";

const AuthLoadingScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const hasNavigated = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (hasNavigated.current) return;

      if (user) {
        try {
          hasNavigated.current = true;
          navigation.replace("Main");
        } catch (error) {
          console.error("Error getting token:", error);
          hasNavigated.current = true;
          navigation.replace("Home");
        }
      } else {
        hasNavigated.current = true;
        navigation.replace("Home");
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.main, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

export default AuthLoadingScreen;

const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
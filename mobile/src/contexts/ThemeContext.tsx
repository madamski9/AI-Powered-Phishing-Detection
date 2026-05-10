import React, { useState, useEffect } from "react";
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
} from "react-native-paper";
import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { themeDark, themeLight } from "../constans/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tryCatch } from "../utils/try-catch";

const themePreferenceFallback = new Map<string, string>();
let asyncStorageUnavailable = false;

async function readThemePreference(key: string): Promise<string | null> {
  if (!asyncStorageUnavailable) {
    const [value, error] = await tryCatch(AsyncStorage.getItem(key));
    if (!error) {
      return value;
    }
    asyncStorageUnavailable = true;
  }

  return themePreferenceFallback.has(key) ? themePreferenceFallback.get(key)! : null;
}

async function writeThemePreference(key: string, value: string): Promise<void> {
  if (!asyncStorageUnavailable) {
    const [, error] = await tryCatch(AsyncStorage.setItem(key, value));
    if (!error) {
      return;
    }
    asyncStorageUnavailable = true;
  }

  themePreferenceFallback.set(key, value);
}

type ThemeContextType = {
  theme: typeof DefaultTheme;
  toggleTheme: () => void;
  isDarkMode: boolean;
};
const defaultTheme: ThemeContextType = {
  theme: DefaultTheme,
  toggleTheme: () => {},
  isDarkMode: false,
};
const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }): React.ReactElement | null => {
  const systemTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemTheme === "dark");
  const theme = isDarkMode ? themeDark : themeLight;
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const userTheme = await readThemePreference("isDarkMode");
      if (userTheme !== null) setIsDarkMode(JSON.parse(userTheme));
      setIsLoading(false);
    })();
  }, [theme]);

  const toggleTheme = async () => {
    const newThemeState = !isDarkMode;
    setIsDarkMode(newThemeState);
    await writeThemePreference("isDarkMode", JSON.stringify(newThemeState));
  };
  if (isLoading) return null;
  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, toggleTheme, isDarkMode } },
    React.createElement(PaperProvider, { theme, children }),
  );
};
export const useThemeContext = () => useContext(ThemeContext);
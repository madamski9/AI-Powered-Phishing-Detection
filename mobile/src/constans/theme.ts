import {
  MD3LightTheme as LightTheme,
  MD3DarkTheme as DarkTheme,
} from "react-native-paper";

export const themeLight = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    primary: "#0F172A",
    secondary: "#334155",
    background: "rgb(244, 244, 244)",
    error: "#B00020",
    onError: "#ffffffff",
    tertiary: "#64748B",
  },
};
export const themeDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#3B82F6",
    secondary: "#334155",
    background: "#1E293B",
    tertiary: "#0F172A",
    error: "#CF6679",
    onError: "#000000",
  },
};
export default themeLight;

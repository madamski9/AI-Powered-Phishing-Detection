import { useEffect } from 'react';
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { StatsProvider } from './src/contexts/StatsContext';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from './src/screens/pre-login/HomeScreen';
import RegisterScreen from './src/screens/pre-login/RegisterScreen';
import MainScreen from './src/screens/main/MainScreen';
import CheckUrlScreen from './src/screens/main/CheckUrlScreen'
import CheckMailScreen from './src/screens/main/CheckMailScreen';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from "./src/contexts/ThemeContext";
import './src/locales/i18n';
import AuthLoadingScreen from './src/screens/auth/AuthLoadingScreen';

const Stack = createNativeStackNavigator();
export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatsProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName='Auth'
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Auth" component={AuthLoadingScreen} />
              <Stack.Screen name="Home" component={HomeScreen}/>
              <Stack.Screen name="Register" component={RegisterScreen}/>
              <Stack.Screen name="Main" component={MainScreen}/>
              <Stack.Screen name="CheckUrl" component={CheckUrlScreen}/>
              <Stack.Screen name="CheckMail" component={CheckMailScreen}/>
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
        </StatsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
import { useEffect } from 'react';
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from './src/screens/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from "./src/contexts/ThemeContext";

const Stack = createNativeStackNavigator();
export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    });
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName='Home'
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Home" component={HomeScreen}/>
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
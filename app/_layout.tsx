import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/services/AppProvider.tsx';
import { colors } from '../src/components/theme.ts';
import AppFrame from '../src/components/AppFrame';
export default function RootLayout() {
  return <AppProvider><AppFrame><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: true, title: 'SpotClip 안내', headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.background } }} /></Stack></AppFrame></AppProvider>;
}

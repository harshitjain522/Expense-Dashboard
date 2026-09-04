import '../global.css';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FinanceProvider } from '@/context/FinanceContext';
import { LockProvider } from '@/context/LockContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Split out so it can read the theme: the modal headers are plain navigator
// chrome, not NativeWind, so they need the palette handed to them directly.
function RootStack() {
  const { colors, scheme } = useTheme();

  // React Navigation paints scene and transition backgrounds itself and falls
  // back to its light theme, which is what flashed white between screens in
  // dark mode. Feeding it the palette covers every navigator at once.
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Transaction',
          }}
        />
        <Stack.Screen
          name="recurring"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Recurring',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Settings',
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <LockProvider>
            <FinanceProvider>
              <RootStack />
            </FinanceProvider>
          </LockProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

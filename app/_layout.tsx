import '../global.css';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';

import { FinanceProvider } from '@/context/FinanceContext';
import { LockProvider } from '@/context/LockContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Split out so it can read the theme: the modal headers are plain navigator
// chrome, not NativeWind, so they need the palette handed to them directly.
function RootStack() {
  const { colors, scheme } = useTheme();
  // Imported per weight rather than from the package root: Metro does not
  // tree-shake, so the root import would bundle all eighteen cuts of each
  // family for the six we actually use.
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

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

  // Hold on the painted background rather than rendering in the system font
  // and reflowing a beat later.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 16 },
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

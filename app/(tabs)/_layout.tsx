import { TopTabs } from 'expo-router/js-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';

export default function TabsLayout() {
  const bottom = Math.max(useSafeAreaInsets().bottom, 8);
  const { colors } = useTheme();

  return (
    <TopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors['ink-faint'],
        tabBarIndicatorStyle: { height: 0 },
        // Two destinations with plain names need no pictograms, and the labels
        // read better with the whole row to themselves.
        tabBarShowIcon: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 52 + bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: 'IBMPlexSans_500Medium',
          textTransform: 'none',
          margin: 0,
        },
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <TopTabs.Screen name="history" options={{ title: 'History' }} />
    </TopTabs>
  );
}

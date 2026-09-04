import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

export function SettingsButton() {
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      className="px-3 py-1.5 rounded-full border border-border"
    >
      <Text className="text-ink-muted text-xs font-ui">Settings</Text>
    </Pressable>
  );
}

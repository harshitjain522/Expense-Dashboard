import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

export function SettingsButton() {
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Setting"
      className="px-3 py-1.5 rounded-full border border-border bg-surface"
    >
      <Text className="text-ink text-xs font-semibold">Setting</Text>
    </Pressable>
  );
}

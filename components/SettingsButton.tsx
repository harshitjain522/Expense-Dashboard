import { Pressable, Text } from 'react-native';

// ponytail: no destination yet — give it an onPress once a settings screen exists.
export function SettingsButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Setting"
      className="px-3 py-1.5 rounded-full border border-border bg-surface"
    >
      <Text className="text-ink text-xs font-semibold">Setting</Text>
    </Pressable>
  );
}

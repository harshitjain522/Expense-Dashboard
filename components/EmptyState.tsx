import React from 'react';
import { Text, View } from 'react-native';

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className="text-4xl mb-3">{icon}</Text>
      <Text className="text-ink text-base font-semibold text-center">{title}</Text>
      {subtitle && <Text className="text-ink-muted text-sm text-center mt-1">{subtitle}</Text>}
    </View>
  );
}

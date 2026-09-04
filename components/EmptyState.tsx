import React from 'react';
import { Text, View } from 'react-native';

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View className="items-center justify-center py-14 px-6">
      <Text className="text-3xl mb-3">{icon}</Text>
      <Text className="text-ink text-base font-display text-center">{title}</Text>
      {subtitle && (
        <Text className="text-ink-muted text-sm font-body text-center mt-1.5">{subtitle}</Text>
      )}
    </View>
  );
}

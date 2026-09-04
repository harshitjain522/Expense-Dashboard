import { Pressable, Text, View } from 'react-native';

import type { TransactionType } from '@/types';

const OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

/**
 * Segmented expense/income switch. `className` styles the track, which sits on
 * the page background in the transaction form and inside a card on the
 * recurring screen, so the contrast has to differ per caller.
 */
export function TypeToggle({
  value,
  onChange,
  className = '',
}: {
  value: TransactionType;
  onChange: (next: TransactionType) => void;
  className?: string;
}) {
  return (
    <View className={`flex-row border border-border rounded-xl p-1 ${className}`}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 items-center py-2.5 rounded-lg ${selected ? 'bg-accent' : ''}`}
          >
            <Text className={`text-sm font-strong ${selected ? 'text-on-accent' : 'text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

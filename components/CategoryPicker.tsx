import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { categoriesFor } from '@/constants/categories';
import type { TransactionType } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
  type: TransactionType;
}

export function CategoryPicker({ value, onChange, type }: CategoryPickerProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {categoriesFor(type).map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(category.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className="items-center px-3 py-2.5 rounded-xl border"
            style={{
              backgroundColor: selected ? `${category.color}1F` : 'transparent',
              borderColor: selected ? category.color : colors.border,
            }}
          >
            <Text className="text-lg">{category.icon}</Text>
            <Text
              className="text-[11px] mt-1 font-ui"
              style={{ color: selected ? category.color : colors['ink-muted'] }}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Filter and option chip. Unselected chips carry no fill and no visible rule,
 * so a strip of nineteen categories reads as a line of words and only the
 * active one registers as a control.
 */
export function CategoryFilterChip({
  label,
  selected,
  color,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tint = color ?? colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="px-3 py-1.5 rounded-full border mr-2"
      style={{
        backgroundColor: selected ? `${tint}1F` : 'transparent',
        borderColor: selected ? tint : 'transparent',
      }}
    >
      <Text className="text-xs font-ui" style={{ color: selected ? tint : colors['ink-muted'] }}>
        {label}
      </Text>
    </Pressable>
  );
}

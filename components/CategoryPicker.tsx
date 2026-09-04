import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { useTheme } from '@/context/ThemeContext';

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(category.id)}
            className="items-center px-3 py-2 rounded-2xl border"
            style={{
              backgroundColor: selected ? `${category.color}1A` : colors.surface,
              borderColor: selected ? category.color : colors.border,
            }}
          >
            <Text className="text-lg">{category.icon}</Text>
            <Text
              className="text-[11px] mt-1 font-medium"
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
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-1.5 rounded-full border mr-2"
      style={{
        backgroundColor: selected ? (color ? `${color}1A` : colors['accent-light']) : colors.surface,
        borderColor: selected ? (color ?? colors.accent) : colors.border,
      }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: selected ? (color ?? colors.accent) : colors['ink-muted'] }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

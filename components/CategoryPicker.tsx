import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
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
              backgroundColor: selected ? `${category.color}1A` : '#FFFFFF',
              borderColor: selected ? category.color : '#E7E7EC',
            }}
          >
            <Text className="text-lg">{category.icon}</Text>
            <Text
              className="text-[11px] mt-1 font-medium"
              style={{ color: selected ? category.color : '#6B6B76' }}
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
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-1.5 rounded-full border mr-2"
      style={{
        backgroundColor: selected ? (color ? `${color}1A` : '#EEF2FF') : '#FFFFFF',
        borderColor: selected ? (color ?? '#4F46E5') : '#E7E7EC',
      }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: selected ? (color ?? '#4F46E5') : '#6B6B76' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

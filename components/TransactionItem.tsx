import React from 'react';
import { Text, View, Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { getCategory } from '@/constants/categories';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TransactionItem({ transaction, onPress, onEdit, onDelete }: TransactionItemProps) {
  const category = getCategory(transaction.categoryId);

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      // The third argument hands back the swipeable's own methods, so closing
      // the row needs no ref of its own.
      renderRightActions={(_progress, _translation, swipeable) => (
        <View className="flex-row items-stretch">
          <Pressable
            onPress={() => {
              swipeable.close();
              onEdit?.();
            }}
            className="w-16 items-center justify-center bg-accent"
          >
            <Text className="text-white text-xs font-semibold">Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              swipeable.close();
              onDelete?.();
            }}
            className="w-16 items-center justify-center bg-danger"
          >
            <Text className="text-white text-xs font-semibold">Delete</Text>
          </Pressable>
        </View>
      )}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center bg-surface px-4 py-3 border-b border-border"
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${category.color}1A` }}
        >
          <Text className="text-base">{category.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-ink text-[15px] font-medium" numberOfLines={1}>
            {transaction.note || category.label}
          </Text>
          <Text className="text-ink-muted text-xs mt-0.5">
            {category.label} · {transaction.paymentMethod} · {formatDateShort(transaction.date)}
          </Text>
        </View>
        <Text className="text-ink text-[15px] font-semibold ml-2">
          {formatCurrency(transaction.amount)}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

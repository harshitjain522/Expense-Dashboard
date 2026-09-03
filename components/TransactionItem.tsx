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
      renderRightActions={(_p, _t, swipeable) => (
        <View className="flex-row items-stretch">
          {([['Edit', 'bg-accent', onEdit], ['Delete', 'bg-danger', onDelete]] as const).map(([label, bg, fn]) => (
            <Pressable
              key={label}
              onPress={() => { swipeable.close(); fn?.(); }}
              className={`w-16 items-center justify-center ${bg}`}
            >
              <Text className="text-white text-xs font-semibold">{label}</Text>
            </Pressable>
          ))}
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

import { Text, View, Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { formatDateShort } from '@/utils/format';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * A passbook line: description on the left edge, money on the right, one
 * hairline between rows and no card around them. Amounts and dates are set in
 * the mono face so the right-hand column stays aligned as figures change.
 */
export function TransactionItem({ transaction, onPress, onEdit, onDelete }: TransactionItemProps) {
  const category = getCategory(transaction.categoryId);
  const { formatAmount } = useFinance();
  const isIncome = transaction.type === 'income';

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
              <Text className="text-on-accent text-xs font-strong">{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center bg-background px-5 py-3.5 border-b border-border"
      >
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${category.color}22` }}
        >
          <Text className="text-sm">{category.icon}</Text>
        </View>
        <View className="flex-1 pr-3">
          <Text className="text-ink text-[15px] font-ui" numberOfLines={1}>
            {transaction.note || category.label}
          </Text>
          <Text className="text-ink-muted text-xs font-body mt-0.5" numberOfLines={1}>
            {category.label} · {transaction.paymentMethod}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-[15px] font-num-strong ${isIncome ? 'text-success' : 'text-ink'}`}>
            {isIncome ? '+' : ''}
            {formatAmount(transaction.amount)}
          </Text>
          <Text className="text-ink-muted text-[11px] font-num mt-1">
            {formatDateShort(transaction.date)}
          </Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

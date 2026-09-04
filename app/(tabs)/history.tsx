import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilterChip } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/context/ThemeContext';
import { SettingsButton } from '@/components/SettingsButton';
import { TransactionItem } from '@/components/TransactionItem';
import { ALL_CATEGORIES } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { toISODate } from '@/utils/format';

type DateRangeOption = 'all' | '7d' | '30d' | 'month';

const RANGE_OPTIONS: { id: DateRangeOption; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
];

function rangeToDates(option: DateRangeOption): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (option === 'all') return {};
  if (option === 'month') {
    return { startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)) };
  }
  const days = option === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { startDate: toISODate(start) };
}

export default function HistoryScreen() {
  const { filterTransactions, deleteTransaction, formatAmount } = useFinance();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<DateRangeOption>('all');

  // The tab pager reads horizontal drags too, so it swallows these filter
  // strips and changes tab instead of scrolling them. Hand the gesture to the
  // strip while a finger is down, and give it back once the scroll settles.
  const holdSwipe = {
    onTouchStart: () => navigation.setOptions({ swipeEnabled: false }),
    onTouchEnd: () => navigation.setOptions({ swipeEnabled: true }),
    onTouchCancel: () => navigation.setOptions({ swipeEnabled: true }),
    onMomentumScrollEnd: () => navigation.setOptions({ swipeEnabled: true }),
  };

  const dates = useMemo(() => rangeToDates(range), [range]);

  const results = useMemo(
    () =>
      filterTransactions({
        query: query.trim() || undefined,
        categoryId,
        ...dates,
      }).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [filterTransactions, query, categoryId, dates]
  );

  const total = results.reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-ink text-[22px] font-display">History</Text>
        <SettingsButton />
      </View>

      <View className="px-5">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes"
          placeholderTextColor={colors['ink-faint']}
          className="border border-border rounded-xl px-4 py-2.5 text-ink text-sm font-body bg-surface"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        {...holdSwipe}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' }}
      >
        {RANGE_OPTIONS.map((opt) => (
          <CategoryFilterChip
            key={opt.id}
            label={opt.label}
            selected={range === opt.id}
            onPress={() => setRange(opt.id)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        {...holdSwipe}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center' }}
      >
        <CategoryFilterChip
          label="All categories"
          selected={!categoryId}
          onPress={() => setCategoryId(undefined)}
        />
        {ALL_CATEGORIES.map((c) => (
          <CategoryFilterChip
            key={c.id}
            label={`${c.icon} ${c.label}`}
            selected={categoryId === c.id}
            color={c.color}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>

      <View className="px-5 py-3 flex-row items-baseline justify-between border-t border-border">
        <Text className="text-ink-muted text-[13px] font-body">
          {results.length} transaction{results.length === 1 ? '' : 's'}
        </Text>
        <Text className="text-ink text-base font-num-strong">{formatAmount(total)}</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={results.length > 0 ? <View className="border-t border-border" /> : null}
        ListEmptyComponent={
          <EmptyState
            icon={'\u{1F50D}'}
            title="No transactions found"
            subtitle="Try a different range or category"
          />
        }
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => router.push(`/transaction/${item.id}`)}
            onEdit={() => router.push(`/transaction/${item.id}`)}
            onDelete={() => deleteTransaction(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

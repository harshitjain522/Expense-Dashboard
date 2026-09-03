import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';

import { EmptyState } from '@/components/EmptyState';
import { SpendingTrendChart } from '@/components/SpendingTrendChart';
import { TransactionItem } from '@/components/TransactionItem';
import { getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import {
  currentMonthKey,
  formatCurrency,
  monthLabel,
  monthLabelShort,
  monthKey,
  shiftMonthKey,
} from '@/utils/format';

const TREND_MONTHS = 6;

export default function DashboardScreen() {
  const { transactions, monthlySpent, totalBudget, setTotalBudget, deleteTransaction, isLoading } =
    useFinance();
  const [editingBudget, setEditingBudget] = useState(false);
  const [draft, setDraft] = useState('');
  const [key, setKey] = useState(currentMonthKey);

  const isCurrentMonth = key >= currentMonthKey();
  const spent = monthlySpent(key);
  const remaining = totalBudget - spent;

  function openBudgetEditor() {
    setDraft(totalBudget > 0 ? String(totalBudget) : '');
    setEditingBudget(true);
  }

  async function saveBudget() {
    await setTotalBudget(Number(draft));
    setEditingBudget(false);
  }

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === key),
    [transactions, key]
  );

  const pieData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of monthTransactions) {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .map(([categoryId, value]) => {
        const category = getCategory(categoryId);
        // Keep the id around: unknown categories all fall back to "Other", so
        // the label alone is not a unique key.
        return { categoryId, value, color: category.color, text: category.label };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // Six months ending at the month being viewed, so the window follows
  // navigation instead of staying pinned to today.
  const trendData = useMemo(
    () =>
      Array.from({ length: TREND_MONTHS }, (_, i) => {
        const month = shiftMonthKey(key, i - (TREND_MONTHS - 1));
        return { monthKey: month, label: monthLabelShort(month), value: monthlySpent(month) };
      }),
    [key, monthlySpent]
  );

  const hasTrendData = trendData.some((point) => point.value > 0);
  const recent = monthTransactions.slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-ink-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="px-5 pt-4 pb-1">
          <Text className="text-ink text-2xl font-bold">Dashboard</Text>
        </View>

        <View className="px-5 pb-1 flex-row items-center">
          <Pressable
            onPress={() => setKey(shiftMonthKey(key, -1))}
            hitSlop={10}
            className="w-8 h-8 rounded-full border border-border bg-surface items-center justify-center"
          >
            <Text className="text-ink-muted text-base leading-none">‹</Text>
          </Pressable>
          <Text className="text-ink text-sm font-medium mx-3">{monthLabel(key)}</Text>
          <Pressable
            onPress={() => setKey(shiftMonthKey(key, 1))}
            disabled={isCurrentMonth}
            hitSlop={10}
            style={{ opacity: isCurrentMonth ? 0.35 : 1 }}
            className="w-8 h-8 rounded-full border border-border bg-surface items-center justify-center"
          >
            <Text className="text-ink-muted text-base leading-none">›</Text>
          </Pressable>
          {!isCurrentMonth && (
            <Pressable onPress={() => setKey(currentMonthKey())} hitSlop={10} className="ml-auto">
              <Text className="text-accent text-xs font-medium">This month</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row px-5 mt-3" style={{ gap: 12 }}>
          <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-ink-muted text-xs">
              {isCurrentMonth ? 'Spent this month' : 'Spent'}
            </Text>
            <Text className="text-ink text-xl font-bold mt-1">{formatCurrency(spent)}</Text>
          </View>
          <Pressable
            onPress={openBudgetEditor}
            className="flex-1 bg-surface rounded-2xl p-4 border border-border"
          >
            <Text className="text-ink-muted text-xs">Budget remaining</Text>
            {totalBudget > 0 ? (
              <Text
                className="text-xl font-bold mt-1"
                style={{ color: remaining < 0 ? '#DC2626' : '#111114' }}
              >
                {formatCurrency(remaining)}
              </Text>
            ) : (
              <Text className="text-accent text-sm font-semibold mt-1.5">Tap to set budget</Text>
            )}
          </Pressable>
        </View>

        <View className="mx-5 mt-4 bg-surface rounded-2xl p-4 border border-border">
          <Text className="text-ink text-[15px] font-semibold">Spending trend</Text>
          <Text className="text-ink-muted text-xs mt-0.5">
            Last {TREND_MONTHS} months · tap a bar to jump to that month
          </Text>
          {hasTrendData ? (
            <SpendingTrendChart data={trendData} selectedMonth={key} onSelectMonth={setKey} />
          ) : (
            <EmptyState icon="📈" title="Nothing to chart yet" subtitle="Add transactions to see your trend" />
          )}
        </View>

        <View className="mx-5 mt-4 bg-surface rounded-2xl p-4 border border-border">
          <Text className="text-ink text-[15px] font-semibold mb-3">By category</Text>
          {pieData.length === 0 ? (
            <EmptyState icon="🧮" title="No spending yet" subtitle="Add a transaction to see the breakdown" />
          ) : (
            <View className="items-center">
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={52}
                innerCircleColor="#FFFFFF"
                centerLabelComponent={() => (
                  <View className="items-center">
                    <Text className="text-ink-muted text-[10px]">Total</Text>
                    <Text className="text-ink text-sm font-bold">{formatCurrency(spent)}</Text>
                  </View>
                )}
              />
              <View className="flex-row flex-wrap mt-4 justify-center" style={{ gap: 12 }}>
                {pieData.map((slice) => (
                  <View key={slice.categoryId} className="flex-row items-center">
                    <View
                      className="w-2.5 h-2.5 rounded-full mr-1.5"
                      style={{ backgroundColor: slice.color }}
                    />
                    <Text className="text-ink-muted text-xs">{slice.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="mt-5">
          <View className="flex-row items-center justify-between px-5 mb-1">
            <Text className="text-ink text-[15px] font-semibold">Recent transactions</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text className="text-accent text-xs font-medium">See all</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <EmptyState icon="💸" title="No transactions yet" subtitle="Tap + to add your first expense" />
          ) : (
            <View className="bg-surface mx-5 rounded-2xl border border-border overflow-hidden">
              {recent.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onPress={() => router.push(`/transaction/${t.id}`)}
                  onEdit={() => router.push(`/transaction/${t.id}`)}
                  onDelete={() => deleteTransaction(t.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push('/transaction/new')}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-accent items-center justify-center"
        style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
      >
        <Text className="text-white text-2xl leading-none">+</Text>
      </Pressable>

      <Modal
        visible={editingBudget}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingBudget(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-surface rounded-2xl p-5 w-full">
            <Text className="text-ink text-base font-semibold mb-1">Monthly budget</Text>
            <Text className="text-ink-muted text-xs mb-4">Set your total spending limit for the month</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#A0A0AC"
              className="border border-border rounded-xl px-4 py-3 text-ink text-base mb-4"
              autoFocus
            />
            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => setEditingBudget(false)}
                className="flex-1 items-center py-3 rounded-xl border border-border"
              >
                <Text className="text-ink-muted font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={saveBudget} className="flex-1 items-center py-3 rounded-xl bg-accent">
                <Text className="text-white font-medium">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

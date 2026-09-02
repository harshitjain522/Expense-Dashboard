import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';

import { EmptyState } from '@/components/EmptyState';
import { TransactionItem } from '@/components/TransactionItem';
import { getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { currentMonthKey, formatCurrency, monthLabel, monthKey } from '@/utils/format';

const TOTAL_BUDGET_KEY = 'total';

export default function DashboardScreen() {
  const { transactions, monthlySpent, monthlyBudgetTotal, setBudget, deleteTransaction, isLoading } =
    useFinance();
  const [editingBudget, setEditingBudget] = useState(false);
  const [draft, setDraft] = useState('');

  const key = currentMonthKey();
  const spent = monthlySpent(key);
  const budgetTotal = monthlyBudgetTotal();
  const remaining = budgetTotal - spent;

  function openBudgetEditor() {
    setDraft(budgetTotal > 0 ? String(budgetTotal) : '');
    setEditingBudget(true);
  }

  async function saveBudget() {
    const value = Number(draft);
    await setBudget(TOTAL_BUDGET_KEY, Number.isFinite(value) && value > 0 ? value : 0);
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
        return { value, color: category.color, text: category.label };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const recent = transactions.slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-ink-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-ink-muted text-xs">{monthLabel(key)}</Text>
            <Text className="text-ink text-2xl font-bold mt-0.5">Dashboard</Text>
          </View>
          <Pressable
            onPress={() => router.push('/transaction/new')}
            className="w-11 h-11 rounded-full bg-accent items-center justify-center"
          >
            <Text className="text-white text-xl leading-none">+</Text>
          </Pressable>
        </View>

        <View className="flex-row px-5 mt-3" style={{ gap: 12 }}>
          <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-ink-muted text-xs">Spent this month</Text>
            <Text className="text-ink text-xl font-bold mt-1">{formatCurrency(spent)}</Text>
          </View>
          <Pressable
            onPress={openBudgetEditor}
            className="flex-1 bg-surface rounded-2xl p-4 border border-border"
          >
            <Text className="text-ink-muted text-xs">Budget remaining</Text>
            {budgetTotal > 0 ? (
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
                  <View key={slice.text} className="flex-row items-center">
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

import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/ProgressRing';
import { useFinance } from '@/context/FinanceContext';
import { currentMonthKey, formatCurrency, monthLabel } from '@/utils/format';

const TOTAL_BUDGET_KEY = 'total';

export default function BudgetsScreen() {
  const { getBudget, setBudget, monthlySpent } = useFinance();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const key = currentMonthKey();
  const limit = getBudget(TOTAL_BUDGET_KEY)?.monthlyLimit ?? 0;
  const spent = monthlySpent(key);
  const hasLimit = limit > 0;
  const progress = hasLimit ? spent / limit : 0;
  const isOver = hasLimit && spent > limit;
  const isNear = hasLimit && !isOver && progress >= 0.8;
  const remaining = limit - spent;
  const statusColor = isOver ? '#DC2626' : isNear ? '#D97706' : '#4F46E5';

  function openEditor() {
    setDraft(hasLimit ? String(limit) : '');
    setEditing(true);
  }

  async function saveBudget() {
    const value = Number(draft);
    await setBudget(TOTAL_BUDGET_KEY, Number.isFinite(value) && value > 0 ? value : 0);
    setEditing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-ink-muted text-xs">{monthLabel(key)}</Text>
        <Text className="text-ink text-2xl font-bold mt-0.5">Budgets</Text>
      </View>

      <View className="px-5 pt-4">
        <Pressable
          onPress={openEditor}
          className="items-center bg-surface rounded-2xl p-6 border border-border"
        >
          <ProgressRing
            progress={progress}
            color={statusColor}
            label={hasLimit ? `${Math.round(progress * 100)}%` : '–'}
            size={120}
            strokeWidth={12}
          />
          <Text className="text-ink-muted text-xs mt-4">
            {formatCurrency(spent)} of {hasLimit ? formatCurrency(limit) : 'no budget set'}
          </Text>
          {hasLimit && (
            <Text
              className="text-sm mt-1 font-medium"
              style={{ color: isOver ? '#DC2626' : isNear ? '#D97706' : '#059669' }}
            >
              {isOver
                ? `Over by ${formatCurrency(Math.abs(remaining))}`
                : `${formatCurrency(remaining)} remaining`}
            </Text>
          )}
          <Text className="text-accent text-xs font-semibold mt-4">
            {hasLimit ? 'Edit budget' : 'Set monthly budget'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
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
                onPress={() => setEditing(false)}
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

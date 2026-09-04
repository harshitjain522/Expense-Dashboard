import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { CURRENCIES } from '@/constants/currencies';
import type { ThemePreference } from '@/constants/theme';
import { useFinance } from '@/context/FinanceContext';
import { useLock } from '@/context/LockContext';
import { useTheme } from '@/context/ThemeContext';
import { transactionsToCsv } from '@/utils/export';
import { toISODate } from '@/utils/format';

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Match the device appearance' },
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
];

export default function SettingsScreen() {
  const { preference, setPreference, colors } = useTheme();
  const {
    transactions,
    totalBudget,
    setTotalBudget,
    isLoading,
    currency,
    setCurrencyCode,
    recurringRules,
    clearAllData,
  } = useFinance();
  const {
    available: biometricsAvailable,
    enabled: lockEnabled,
    setEnabled: setLockEnabled,
  } = useLock();

  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const hydrated = useRef(false);

  // Budgets load asynchronously, so the stored amount may not be there on the
  // first render. Fill the field once it arrives, but only once, so it can't
  // overwrite an edit in progress.
  useEffect(() => {
    if (hydrated.current || isLoading) return;
    hydrated.current = true;
    if (totalBudget > 0) setDraft(String(totalBudget));
  }, [isLoading, totalBudget]);

  async function saveBudget() {
    await setTotalBudget(Number(draft));
    setSaved(true);
  }

  async function exportCsv() {
    if (!transactions.length) {
      Alert.alert('Nothing to export', 'Add a transaction first.');
      return;
    }
    try {
      const file = new File(Paths.cache, `expenses-${toISODate(new Date())}.csv`);
      file.create({ overwrite: true });
      file.write(transactionsToCsv(transactions));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export transactions',
        });
      } else {
        Alert.alert('Sharing unavailable', `The file was written to ${file.uri}`);
      }
    } catch (error) {
      Alert.alert('Export failed', String(error));
    }
  }

  function confirmClear() {
    Alert.alert(
      'Clear all data?',
      'Every transaction, budget and recurring rule is deleted. Your appearance, currency and lock settings are kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => void clearAllData(),
        },
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View className="bg-surface rounded-2xl border border-border overflow-hidden">
        <Text className="text-ink text-[15px] font-semibold px-4 pt-4 pb-1">Appearance</Text>
        {THEME_OPTIONS.map((option, index) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`flex-row items-center justify-between px-4 py-3 ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              <View className="flex-1">
                <Text className="text-ink text-sm font-medium">{option.label}</Text>
                <Text className="text-ink-muted text-xs mt-0.5">{option.hint}</Text>
              </View>
              {selected && <Text className="text-accent text-base font-bold ml-3">✓</Text>}
            </Pressable>
          );
        })}
      </View>

      <View className="bg-surface rounded-2xl border border-border p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-ink text-[15px] font-semibold">Biometric lock</Text>
            <Text className="text-ink-muted text-xs mt-0.5">
              {biometricsAvailable
                ? 'Require your fingerprint or face to open the app'
                : 'No fingerprint or face is enrolled on this device'}
            </Text>
          </View>
          <Switch
            value={lockEnabled}
            onValueChange={(next) => void setLockEnabled(next)}
            disabled={!biometricsAvailable}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/recurring')}
        accessibilityRole="button"
        className="bg-surface rounded-2xl border border-border p-4 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className="text-ink text-[15px] font-semibold">Recurring transactions</Text>
          <Text className="text-ink-muted text-xs mt-0.5">
            {recurringRules.length
              ? `${recurringRules.length} active`
              : 'Rent, salary, subscriptions'}
          </Text>
        </View>
        <Text className="text-ink-faint text-lg">›</Text>
      </Pressable>

      <View className="bg-surface rounded-2xl border border-border p-4">
        <Text className="text-ink text-[15px] font-semibold">Monthly budget</Text>
        <Text className="text-ink-muted text-xs mt-0.5 mb-3">
          Your total spending limit for the month
        </Text>
        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setSaved(false);
          }}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors['ink-faint']}
          className="border border-border rounded-xl px-4 py-3 text-ink text-base"
        />
        <Pressable onPress={saveBudget} className="mt-3 items-center py-3 rounded-xl bg-accent">
          <Text className="text-white font-medium">{saved ? 'Saved' : 'Save budget'}</Text>
        </Pressable>
      </View>

      <View className="bg-surface rounded-2xl border border-border p-4">
        <Text className="text-ink text-[15px] font-semibold">Currency</Text>
        <Text className="text-ink-muted text-xs mt-0.5 mb-3">Changes how every amount is shown</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {CURRENCIES.map((option) => {
            const selected = option.code === currency.code;
            return (
              <Pressable
                key={option.code}
                onPress={() => void setCurrencyCode(option.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className="px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: selected ? colors['accent-light'] : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: selected ? colors.accent : colors['ink-muted'] }}
                >
                  {option.symbol} {option.code}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="bg-surface rounded-2xl border border-border p-4">
        <Text className="text-ink text-[15px] font-semibold">Data</Text>
        <Text className="text-ink-muted text-xs mt-0.5 mb-3">
          {transactions.length} transaction{transactions.length === 1 ? '' : 's'} stored on this
          device
        </Text>
        <Pressable
          onPress={exportCsv}
          accessibilityRole="button"
          className="items-center py-3 rounded-xl border border-border"
        >
          <Text className="text-ink font-medium">Export as CSV</Text>
        </Pressable>
        <Pressable
          onPress={confirmClear}
          accessibilityRole="button"
          className="mt-2 items-center py-3 rounded-xl"
          style={{ backgroundColor: colors['danger-light'] }}
        >
          <Text className="font-medium" style={{ color: colors.danger }}>
            Clear all data
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

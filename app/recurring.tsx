import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { DEFAULT_CATEGORY_ID, PAYMENT_METHODS, getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, fromISODate, toISODate } from '@/utils/format';
import type { PaymentMethod, RecurrenceFrequency, TransactionType } from '@/types';

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringScreen() {
  const { recurringRules, addRecurringRule, deleteRecurringRule, formatAmount, currency } =
    useFinance();
  const { colors } = useTheme();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY_ID.expense);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [note, setNote] = useState('');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  function selectType(next: TransactionType) {
    setType(next);
    setCategoryId(DEFAULT_CATEGORY_ID[next]);
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) setStartDate(toISODate(selected));
  }

  async function add() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Enter an amount', 'A recurring rule needs an amount above zero.');
      return;
    }
    await addRecurringRule({
      type,
      amount: value,
      categoryId,
      note: note.trim(),
      paymentMethod,
      frequency,
      nextDate: startDate,
    });
    setAmount('');
    setNote('');
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert('Stop this rule?', `"${label}" will stop generating new transactions. Ones it already created are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => void deleteRecurringRule(id) },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View className="bg-surface rounded-2xl border border-border p-4">
        <Text className="text-ink text-[15px] font-semibold mb-3">New rule</Text>

        <View className="flex-row bg-background border border-border rounded-xl p-1 mb-4">
          {(['expense', 'income'] as const).map((option) => {
            const selected = type === option;
            return (
              <Pressable
                key={option}
                onPress={() => selectType(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`flex-1 items-center py-2 rounded-lg ${selected ? 'bg-accent' : ''}`}
              >
                <Text
                  className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink-muted'}`}
                >
                  {option === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center border border-border rounded-xl px-4 mb-4">
          <Text className="text-ink text-xl font-bold mr-1">{currency.symbol}</Text>
          <TextInput
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors['ink-faint']}
            className="text-ink text-xl font-bold flex-1 py-2.5"
          />
        </View>

        <View className="mb-4">
          <CategoryPicker value={categoryId} onChange={setCategoryId} type={type} />
        </View>

        <View className="flex-row mb-4" style={{ gap: 8 }}>
          {FREQUENCIES.map((option) => {
            const selected = frequency === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFrequency(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className="flex-1 items-center py-2.5 rounded-xl border"
                style={{
                  backgroundColor: selected ? colors['accent-light'] : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: selected ? colors.accent : colors['ink-muted'] }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className="px-3 py-1.5 rounded-full border mr-2"
                style={{
                  backgroundColor: selected ? colors['accent-light'] : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: selected ? colors.accent : colors['ink-muted'] }}
                >
                  {method}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center justify-between border border-border rounded-xl px-4 py-3 mb-3"
        >
          <Text className="text-ink-muted text-xs">Starts</Text>
          <Text className="text-ink text-sm">{formatDate(startDate)}</Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={fromISODate(startDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
          />
        )}

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note, e.g. Rent"
          placeholderTextColor={colors['ink-faint']}
          className="border border-border rounded-xl px-4 py-3 text-ink text-sm mb-3"
        />

        <Pressable onPress={add} className="items-center py-3 rounded-xl bg-accent">
          <Text className="text-white font-medium">Add rule</Text>
        </Pressable>
      </View>

      {recurringRules.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="No recurring transactions"
          subtitle="Add rent, salary or a subscription and it will be entered for you"
        />
      ) : (
        <View className="bg-surface rounded-2xl border border-border overflow-hidden">
          {recurringRules.map((rule, index) => {
            const category = getCategory(rule.categoryId);
            const label = rule.note || category.label;
            return (
              <View
                key={rule.id}
                className={`flex-row items-center px-4 py-3 ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <Text className="text-base mr-3">{category.icon}</Text>
                <View className="flex-1">
                  <Text className="text-ink text-sm font-medium" numberOfLines={1}>
                    {label}
                  </Text>
                  <Text className="text-ink-muted text-xs mt-0.5">
                    {FREQUENCIES.find((f) => f.value === rule.frequency)?.label} · next{' '}
                    {formatDate(rule.nextDate)}
                  </Text>
                </View>
                <Text
                  className="text-sm font-semibold mr-3"
                  style={{ color: rule.type === 'income' ? colors.success : colors.ink }}
                >
                  {rule.type === 'income' ? '+' : ''}
                  {formatAmount(rule.amount)}
                </Text>
                <Pressable
                  onPress={() => confirmDelete(rule.id, label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Stop ${label}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.danger }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

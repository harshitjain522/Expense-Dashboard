import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { CategoryFilterChip, CategoryPicker } from '@/components/CategoryPicker';
import { TypeToggle } from '@/components/TypeToggle';
import { DEFAULT_CATEGORY_ID, PAYMENT_METHODS } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, fromISODate, toISODate } from '@/utils/format';
import type { PaymentMethod, TransactionDraft, TransactionType } from '@/types';

function createEmptyDraft(): TransactionDraft {
  return {
    type: 'expense',
    amount: '',
    categoryId: 'food',
    date: toISODate(new Date()),
    note: '',
    paymentMethod: 'UPI',
  };
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="text-ink-muted text-[13px] font-ui mb-2">{children}</Text>;
}

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const isNew = id === 'new';
  const { getTransaction, addTransaction, updateTransaction, deleteTransaction, currency } =
    useFinance();

  const [draft, setDraft] = useState<TransactionDraft>(createEmptyDraft);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const hydrated = useRef(false);

  const existing = isNew ? undefined : getTransaction(id);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'Add Transaction' : 'Edit Transaction' });
  }, [navigation, isNew]);

  // Transactions load asynchronously, so the record may not exist yet on the
  // first render. Hydrate whenever it first appears, but only once, so later
  // writes to the store can't wipe out edits in progress.
  useEffect(() => {
    if (hydrated.current || !existing) return;
    hydrated.current = true;
    setDraft({
      type: existing.type,
      amount: String(existing.amount),
      categoryId: existing.categoryId,
      date: existing.date,
      note: existing.note,
      paymentMethod: existing.paymentMethod,
    });
  }, [existing]);

  // The two category lists share no ids, so switching type must move the
  // selection onto a valid category instead of leaving a stale one behind.
  function selectType(type: TransactionType) {
    setDraft((prev) => ({ ...prev, type, categoryId: DEFAULT_CATEGORY_ID[type] }));
  }

  function updateField<K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    // Android shows a native dialog that closes itself; iOS renders inline and
    // stays open until the user taps Done.
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      updateField('date', toISODate(selected));
    }
  }

  async function handleSave() {
    const amountNumber = Number(draft.amount);
    if (!draft.amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    // Both sides are YYYY-MM-DD, so a plain string compare orders them correctly.
    if (draft.date > toISODate(new Date())) {
      Alert.alert('Invalid date', 'You cannot add a transaction dated in the future.');
      return;
    }
    if (isNew) {
      await addTransaction(draft);
    } else {
      await updateTransaction(id, draft);
    }
    router.back();
  }

  function handleDelete() {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20 }}>
      <TypeToggle value={draft.type} onChange={selectType} className="bg-surface mb-7" />

      {/* No label: the currency mark and the size say what this is. */}
      <View className="flex-row items-center border-b border-border pb-2 mb-7">
        <Text className="text-ink-muted text-3xl font-num mr-2">{currency.symbol}</Text>
        <TextInput
          value={draft.amount}
          onChangeText={(v) => updateField('amount', v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel="Amount"
          className="text-ink text-4xl font-num-strong flex-1 py-1"
        />
      </View>

      <FieldLabel>Category</FieldLabel>
      <View className="mb-7">
        <CategoryPicker
          value={draft.categoryId}
          onChange={(v) => updateField('categoryId', v)}
          type={draft.type}
        />
      </View>

      <FieldLabel>Date</FieldLabel>
      <Pressable
        onPress={() => setShowDatePicker(true)}
        className="flex-row items-center justify-between border border-border rounded-xl px-4 py-3 mb-7 bg-surface"
      >
        <Text className="text-ink text-base font-body">{formatDate(draft.date)}</Text>
        <Text className="text-base">{'\u{1F4C5}'}</Text>
      </Pressable>

      {showDatePicker &&
        (Platform.OS === 'ios' ? (
          <View className="bg-surface border border-border rounded-xl mb-7 overflow-hidden">
            <DateTimePicker
              value={fromISODate(draft.date)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
            <Pressable
              onPress={() => setShowDatePicker(false)}
              className="items-center py-3 border-t border-border"
            >
              <Text className="text-accent font-strong">Done</Text>
            </Pressable>
          </View>
        ) : (
          <DateTimePicker
            value={fromISODate(draft.date)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        ))}

      <FieldLabel>Paid with</FieldLabel>
      <View className="flex-row flex-wrap mb-7" style={{ rowGap: 8 }}>
        {PAYMENT_METHODS.map((method) => (
          <CategoryFilterChip
            key={method}
            label={method}
            selected={draft.paymentMethod === method}
            onPress={() => updateField('paymentMethod', method as PaymentMethod)}
          />
        ))}
      </View>

      <FieldLabel>Note</FieldLabel>
      <TextInput
        value={draft.note}
        onChangeText={(v) => updateField('note', v)}
        placeholder="What was it for?"
        placeholderTextColor={colors['ink-faint']}
        className="border border-border rounded-xl px-4 py-3 text-ink text-base font-body mb-8 bg-surface"
        multiline
      />

      <Pressable onPress={handleSave} className="items-center py-4 rounded-xl bg-accent mb-3">
        <Text className="text-on-accent font-strong text-base">
          {isNew ? 'Add transaction' : 'Save changes'}
        </Text>
      </Pressable>

      {!isNew && (
        <Pressable
          onPress={handleDelete}
          className="items-center py-4 rounded-xl border border-danger"
        >
          <Text className="text-danger font-strong text-base">Delete transaction</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

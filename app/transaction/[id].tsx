import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { CategoryPicker } from '@/components/CategoryPicker';
import { PAYMENT_METHODS } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import type { PaymentMethod, TransactionDraft } from '@/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_DRAFT: TransactionDraft = {
  amount: '',
  categoryId: 'food',
  date: today(),
  note: '',
  paymentMethod: 'Card',
};

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const isNew = id === 'new';
  const { getTransaction, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const [draft, setDraft] = useState<TransactionDraft>(EMPTY_DRAFT);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'Add Transaction' : 'Edit Transaction' });
    if (!isNew) {
      const existing = getTransaction(id);
      if (existing) {
        setDraft({
          amount: String(existing.amount),
          categoryId: existing.categoryId,
          date: existing.date,
          note: existing.note,
          paymentMethod: existing.paymentMethod,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateField<K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const amountNumber = Number(draft.amount);
    if (!draft.amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than 0.');
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
      <Text className="text-ink-muted text-xs font-medium mb-1.5">AMOUNT</Text>
      <View className="flex-row items-center border border-border rounded-xl px-4 mb-5 bg-surface">
        <Text className="text-ink text-2xl font-bold mr-1">₹</Text>
        <TextInput
          value={draft.amount}
          onChangeText={(v) => updateField('amount', v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#A0A0AC"
          className="text-ink text-2xl font-bold flex-1 py-3"
        />
      </View>

      <Text className="text-ink-muted text-xs font-medium mb-1.5">CATEGORY</Text>
      <View className="mb-5">
        <CategoryPicker value={draft.categoryId} onChange={(v) => updateField('categoryId', v)} />
      </View>

      <Text className="text-ink-muted text-xs font-medium mb-1.5">DATE</Text>
      <TextInput
        value={draft.date}
        onChangeText={(v) => updateField('date', v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#A0A0AC"
        className="border border-border rounded-xl px-4 py-3 text-ink text-base mb-5 bg-surface"
      />

      <Text className="text-ink-muted text-xs font-medium mb-1.5">PAYMENT METHOD</Text>
      <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
        {PAYMENT_METHODS.map((method) => {
          const selected = draft.paymentMethod === method;
          return (
            <Pressable
              key={method}
              onPress={() => updateField('paymentMethod', method as PaymentMethod)}
              className="px-3 py-2 rounded-xl border"
              style={{
                backgroundColor: selected ? '#EEF2FF' : '#FFFFFF',
                borderColor: selected ? '#4F46E5' : '#E7E7EC',
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: selected ? '#4F46E5' : '#6B6B76' }}
              >
                {method}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-ink-muted text-xs font-medium mb-1.5">NOTE</Text>
      <TextInput
        value={draft.note}
        onChangeText={(v) => updateField('note', v)}
        placeholder="Optional note"
        placeholderTextColor="#A0A0AC"
        className="border border-border rounded-xl px-4 py-3 text-ink text-base mb-6 bg-surface"
        multiline
      />

      <Pressable onPress={handleSave} className="items-center py-4 rounded-xl bg-accent mb-3">
        <Text className="text-white font-semibold text-base">
          {isNew ? 'Add Transaction' : 'Save Changes'}
        </Text>
      </Pressable>

      {!isNew && (
        <Pressable onPress={handleDelete} className="items-center py-4 rounded-xl border border-danger">
          <Text className="text-danger font-semibold text-base">Delete Transaction</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

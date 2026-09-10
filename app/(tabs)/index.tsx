import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { SettingsButton } from '@/components/SettingsButton';
import { SpendingTrendChart } from '@/components/SpendingTrendChart';
import { TransactionItem } from '@/components/TransactionItem';
import { getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import {
  currentMonthKey,
  monthLabel,
  monthLabelShort,
  monthKey,
  shiftMonthKey,
} from '@/utils/format';

const TREND_MONTHS = 6;

/** Rule-and-heading pair. Sections are divided by a line, not boxed in a card. */
function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="border-t border-border mt-6 pt-5">
      <View className="flex-row items-baseline justify-between px-5 mb-4">
        <Text className="text-ink text-base font-display">{title}</Text>
        {action && (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text className="text-accent text-xs font-ui">{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const {
    transactions,
    monthlySpent,
    monthlyIncome,
    totalBudget,
    deleteTransaction,
    isLoading,
    formatAmount,
    toDisplayAmount,
  } = useFinance();
  const { colors } = useTheme();
  const [key, setKey] = useState(currentMonthKey);

  const isCurrentMonth = key >= currentMonthKey();
  const spent = monthlySpent(key);
  const income = monthlyIncome(key);
  const net = income - spent;
  const remaining = totalBudget - spent;
  const overBudget = totalBudget > 0 && remaining < 0;

  // Only meaningful while the month is still running: a past month has no days
  // left to spread the remainder over.
  const now = new Date();
  const daysLeft = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    : 0;

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === key),
    [transactions, key]
  );

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    // Expenses only: the breakdown answers "where did the money go", so a
    // salary row would otherwise dominate it as a phantom category.
    for (const t of monthTransactions.filter((t) => t.type === 'expense')) {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .map(([categoryId, value]) => {
        const category = getCategory(categoryId);
        // Keep the id around: unknown categories all fall back to "Other", so
        // the label alone is not a unique key.
        return {
          categoryId,
          value,
          color: category.color,
          icon: category.icon,
          label: category.label,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // Six months ending at the month being viewed, so the window follows
  // navigation instead of staying pinned to today.
  const trendData = useMemo(
    () =>
      Array.from({ length: TREND_MONTHS }, (_, i) => {
        const month = shiftMonthKey(key, i - (TREND_MONTHS - 1));
        return {
          monthKey: month,
          label: monthLabelShort(month),
          value: toDisplayAmount(monthlySpent(month)),
        };
      }),
    [key, monthlySpent, toDisplayAmount]
  );

  const hasTrendData = trendData.some((point) => point.value > 0);
  const recent = monthTransactions.slice(0, 5);
  // Bars are scaled against the biggest category, not the month total, so the
  // shape stays readable when spending is spread thin across many categories.
  const largest = byCategory[0]?.value ?? 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-ink-muted font-body">Loading</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="px-5 pt-4 flex-row items-center">
          <Pressable
            onPress={() => setKey(shiftMonthKey(key, -1))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Text className="text-ink-muted text-xl font-body leading-none">&#8249;</Text>
          </Pressable>
          <Text className="text-ink text-[22px] font-display mx-3">{monthLabel(key)}</Text>
          <Pressable
            onPress={() => setKey(shiftMonthKey(key, 1))}
            disabled={isCurrentMonth}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
          >
            <Text className="text-ink-muted text-xl font-body leading-none">&#8250;</Text>
          </Pressable>
          <View className="ml-auto">
            <SettingsButton />
          </View>
        </View>

        <View className="px-5 pt-7 pb-6">
          {totalBudget > 0 ? (
            <>
              <Text
                className="text-[52px] font-display leading-none"
                style={{ color: overBudget ? colors.flag : colors.ink }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(Math.abs(remaining))}
              </Text>
              <Text className="text-ink-muted text-[13px] font-body mt-2.5">
                {overBudget ? 'over budget' : 'left to spend'}
                {daysLeft > 0 ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go` : ''}
              </Text>
              <View className="h-1.5 rounded-full bg-border overflow-hidden mt-4">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (spent / totalBudget) * 100)}%`,
                    backgroundColor: overBudget ? colors.flag : colors.accent,
                  }}
                />
              </View>
              <Text className="text-ink-muted text-xs font-num mt-2">
                {formatAmount(spent)} of {formatAmount(totalBudget)}
              </Text>
            </>
          ) : (
            <>
              <Text
                className="text-ink text-[52px] font-display leading-none"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(spent)}
              </Text>
              <Text className="text-ink-muted text-[13px] font-body mt-2.5">
                spent in {monthLabel(key)}
              </Text>
              <Pressable onPress={() => router.push('/settings')} className="mt-4 self-start">
                <Text className="text-accent text-[13px] font-ui">Set a monthly budget</Text>
              </Pressable>
            </>
          )}
        </View>

        <View className="flex-row border-t border-border">
          {[
            { label: 'Spent', value: formatAmount(spent), color: colors.ink },
            { label: 'Income', value: formatAmount(income), color: colors.success },
            {
              label: 'Net',
              value: `${net > 0 ? '+' : ''}${formatAmount(net)}`,
              color: net < 0 ? colors.danger : colors.success,
            },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 px-5 py-4">
              <Text className="text-ink-muted text-[11px] font-body">{stat.label}</Text>
              <Text className="text-[15px] font-num-strong mt-1" style={{ color: stat.color }}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <Section title="Where it went">
          {byCategory.length === 0 ? (
            <EmptyState
              icon={'\u{1F9EE}'}
              title="No spending yet"
              subtitle="Add a transaction to see the breakdown"
            />
          ) : (
            <View className="px-5">
              {byCategory.map((row) => (
                <View key={row.categoryId} className="mb-3.5">
                  <View className="flex-row items-center mb-1.5">
                    <Text className="text-xs mr-2">{row.icon}</Text>
                    <Text className="text-ink text-[13px] font-ui flex-1" numberOfLines={1}>
                      {row.label}
                    </Text>
                    <Text className="text-ink text-[13px] font-num">{formatAmount(row.value)}</Text>
                  </View>
                  <View className="h-1 rounded-full bg-border overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${largest > 0 ? (row.value / largest) * 100 : 0}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Six months">
          {hasTrendData ? (
            <View className="px-5">
              <Text className="text-ink-muted text-xs font-body mb-1">
                Tap a bar to jump to that month
              </Text>
              <SpendingTrendChart data={trendData} selectedMonth={key} onSelectMonth={setKey} />
            </View>
          ) : (
            <EmptyState
              icon={'\u{1F4C8}'}
              title="Nothing to chart yet"
              subtitle="Add transactions to see your trend"
            />
          )}
        </Section>

        <Section title="Recent" action="See all" onAction={() => router.push('/history')}>
          {recent.length === 0 ? (
            <EmptyState
              icon={'\u{1F4B8}'}
              title="No transactions yet"
              subtitle="Tap the plus to add your first expense"
            />
          ) : (
            <View className="border-t border-border">
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
        </Section>
      </ScrollView>

      {!isCurrentMonth && (
        <Pressable
          onPress={() => setKey(currentMonthKey())}
          className="absolute bottom-6 left-5 px-3.5 py-2 rounded-full border border-border bg-surface"
        >
          <Text className="text-ink-muted text-xs font-ui">Back to this month</Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push('/transaction/new')}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-flag items-center justify-center"
        style={{
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Text className="text-on-accent text-3xl font-body leading-none">+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

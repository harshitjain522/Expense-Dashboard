import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DEFAULT_CURRENCY_CODE, getCurrency, type Currency } from '@/constants/currencies';
import { clearAll, readCollection, readValue, writeCollection, writeValue } from '@/utils/storage';
import { advanceDate, currentMonthKey, formatCurrency, monthKey, toISODate } from '@/utils/format';
import type {
  RecurringRule,
  Transaction,
  TransactionDraft,
  TransactionFilters,
  TransactionType,
} from '@/types';

/** Stops a corrupt date from spinning the catch-up loop forever. */
const MAX_CATCH_UP_OCCURRENCES = 500;

interface FinanceContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (draft: TransactionDraft) => Promise<void>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  filterTransactions: (filters: TransactionFilters) => Transaction[];
  monthlySpent: (key?: string) => number;
  monthlyIncome: (key?: string) => number;
  categorySpent: (categoryId: string, key?: string) => number;
  totalBudget: number;
  setTotalBudget: (amount: number) => Promise<void>;
  recurringRules: RecurringRule[];
  addRecurringRule: (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  currency: Currency;
  setCurrencyCode: (code: string) => Promise<void>;
  /** Formats in the chosen currency. Screens use this rather than formatCurrency. */
  formatAmount: (value: number) => string;
  clearAllData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Rows written before income tracking existed are all expenses. */
function migrateTransaction(t: Transaction): Transaction {
  return t.type ? t : { ...t, type: 'expense' };
}

/**
 * Emits every occurrence a rule still owes up to today and advances it past
 * them, so an app left closed for three months catches up in one pass.
 */
function catchUpRules(
  rules: RecurringRule[],
  today: string
): { rules: RecurringRule[]; generated: Transaction[] } {
  const generated: Transaction[] = [];
  const now = new Date().toISOString();

  const advanced = rules.map((rule) => {
    let nextDate = rule.nextDate;
    let emitted = 0;
    while (nextDate <= today && emitted < MAX_CATCH_UP_OCCURRENCES) {
      generated.push({
        id: generateId(),
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        date: nextDate,
        note: rule.note,
        paymentMethod: rule.paymentMethod,
        createdAt: now,
        updatedAt: now,
        recurringRuleId: rule.id,
      });
      nextDate = advanceDate(nextDate, rule.frequency);
      emitted += 1;
    }
    return nextDate === rule.nextDate ? rule : { ...rule, nextDate };
  });

  return { rules: advanced, generated };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const [totalBudget, setTotalBudgetState] = useState(0);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [currencyCode, setCurrencyCodeState] = useState(DEFAULT_CURRENCY_CODE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTransactions, storedBudget, legacyBudgets, storedRules, storedCurrency] =
        await Promise.all([
          readCollection<Transaction>('transactions'),
          readValue('budget'),
          readCollection<{ categoryId: string; monthlyLimit: number }>('budgets'),
          readCollection<RecurringRule>('recurring'),
          readValue('currency'),
        ]);

      // The budget used to live as a one-row collection keyed "total", itself a
      // leftover from per-category budgets. Lift it to a plain value once.
      if (storedBudget !== null) {
        setTotalBudgetState(Number(storedBudget) || 0);
      } else {
        const legacy = legacyBudgets.find((b) => b.categoryId === 'total')?.monthlyLimit ?? 0;
        setTotalBudgetState(legacy);
        if (legacy) await writeValue('budget', String(legacy));
      }
      if (legacyBudgets.length) await writeCollection('budgets', []);

      const migrated = storedTransactions.map(migrateTransaction);
      const { rules, generated } = catchUpRules(storedRules, toISODate(new Date()));
      const nextTransactions = generated.length
        ? [...generated, ...migrated].sort((a, b) => b.date.localeCompare(a.date))
        : migrated;

      setTransactions(nextTransactions);
      transactionsRef.current = nextTransactions;
      setRecurringRules(rules);
      if (storedCurrency) setCurrencyCodeState(storedCurrency);

      if (generated.length) {
        await writeCollection('transactions', nextTransactions);
        await writeCollection('recurring', rules);
      }

      setIsLoading(false);
    })();
  }, []);

  /**
   * Applies an update against the latest transactions rather than whatever the
   * caller captured at render time. The ref is written synchronously, so two
   * mutations fired before React re-renders (swiping two rows away in quick
   * succession, say) still compose instead of the second undoing the first.
   */
  const persistTransactions = useCallback(
    async (updater: (prev: Transaction[]) => Transaction[]) => {
      const next = updater(transactionsRef.current);
      transactionsRef.current = next;
      setTransactions(next);
      await writeCollection('transactions', next);
    },
    []
  );

  const persistRules = useCallback(async (next: RecurringRule[]) => {
    setRecurringRules(next);
    await writeCollection('recurring', next);
  }, []);

  const addTransaction = useCallback(
    async (draft: TransactionDraft) => {
      const now = new Date().toISOString();
      const transaction: Transaction = {
        id: generateId(),
        type: draft.type,
        amount: Number(draft.amount) || 0,
        categoryId: draft.categoryId,
        date: draft.date,
        note: draft.note.trim(),
        paymentMethod: draft.paymentMethod,
        createdAt: now,
        updatedAt: now,
      };
      await persistTransactions((prev) => [transaction, ...prev]);
    },
    [persistTransactions]
  );

  const updateTransaction = useCallback(
    async (id: string, draft: TransactionDraft) => {
      await persistTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                type: draft.type,
                amount: Number(draft.amount) || 0,
                categoryId: draft.categoryId,
                date: draft.date,
                note: draft.note.trim(),
                paymentMethod: draft.paymentMethod,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    },
    [persistTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await persistTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [persistTransactions]
  );

  const getTransaction = useCallback(
    (id: string) => transactions.find((t) => t.id === id),
    [transactions]
  );

  const setTotalBudget = useCallback(async (amount: number) => {
    const next = Number.isFinite(amount) && amount > 0 ? amount : 0;
    setTotalBudgetState(next);
    await writeValue('budget', String(next));
  }, []);

  const addRecurringRule = useCallback(
    async (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => {
      const created: RecurringRule = {
        ...rule,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      // Catch up immediately so a rule starting today or backdated produces its
      // transactions now rather than waiting for the next launch.
      const { rules, generated } = catchUpRules([created], toISODate(new Date()));
      await persistRules([...recurringRules, ...rules]);
      if (generated.length) {
        await persistTransactions((prev) =>
          [...generated, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
      }
    },
    [recurringRules, persistRules, persistTransactions]
  );

  const deleteRecurringRule = useCallback(
    async (id: string) => {
      // Transactions it already generated stay: they are real money that moved.
      await persistRules(recurringRules.filter((r) => r.id !== id));
    },
    [recurringRules, persistRules]
  );

  const setCurrencyCode = useCallback(async (code: string) => {
    setCurrencyCodeState(code);
    await writeValue('currency', code);
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAll();
    transactionsRef.current = [];
    setTransactions([]);
    setTotalBudgetState(0);
    setRecurringRules([]);
  }, []);

  const filterTransactions = useCallback(
    (filters: TransactionFilters) => {
      return transactions.filter((t) => {
        if (filters.type && t.type !== filters.type) return false;
        if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
        if (filters.startDate && t.date < filters.startDate) return false;
        if (filters.endDate && t.date > filters.endDate) return false;
        if (filters.query) {
          const q = filters.query.toLowerCase();
          if (!t.note.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    },
    [transactions]
  );

  const sumFor = useCallback(
    (type: TransactionType, key: string) =>
      transactions
        .filter((t) => t.type === type && monthKey(t.date) === key)
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const monthlySpent = useCallback(
    (key: string = currentMonthKey()) => sumFor('expense', key),
    [sumFor]
  );

  const monthlyIncome = useCallback(
    (key: string = currentMonthKey()) => sumFor('income', key),
    [sumFor]
  );

  const categorySpent = useCallback(
    (categoryId: string, key: string = currentMonthKey()) =>
      transactions
        .filter(
          (t) => t.type === 'expense' && t.categoryId === categoryId && monthKey(t.date) === key
        )
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const currency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  const formatAmount = useCallback((value: number) => formatCurrency(value, currency), [currency]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      transactions,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getTransaction,
      filterTransactions,
      monthlySpent,
      monthlyIncome,
      categorySpent,
      totalBudget,
      setTotalBudget,
      recurringRules,
      addRecurringRule,
      deleteRecurringRule,
      currency,
      setCurrencyCode,
      formatAmount,
      clearAllData,
    }),
    [
      transactions,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getTransaction,
      filterTransactions,
      monthlySpent,
      monthlyIncome,
      categorySpent,
      totalBudget,
      setTotalBudget,
      recurringRules,
      addRecurringRule,
      deleteRecurringRule,
      currency,
      setCurrencyCode,
      formatAmount,
      clearAllData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}

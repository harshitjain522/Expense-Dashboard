import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readCollection, writeCollection } from '@/utils/storage';
import { currentMonthKey, monthKey } from '@/utils/format';
import type { Budget, Transaction, TransactionDraft, TransactionFilters } from '@/types';

interface FinanceContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  addTransaction: (draft: TransactionDraft) => Promise<void>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  setBudget: (categoryId: string, monthlyLimit: number) => Promise<void>;
  getBudget: (categoryId: string) => Budget | undefined;
  filterTransactions: (filters: TransactionFilters) => Transaction[];
  monthlySpent: (key?: string) => number;
  categorySpent: (categoryId: string, key?: string) => number;
  monthlyBudgetTotal: () => number;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTransactions, storedBudgets] = await Promise.all([
        readCollection<Transaction>('transactions'),
        readCollection<Budget>('budgets'),
      ]);
      setTransactions(storedTransactions);
      setBudgets(storedBudgets);
      setIsLoading(false);
    })();
  }, []);

  const persistTransactions = useCallback(async (next: Transaction[]) => {
    setTransactions(next);
    await writeCollection('transactions', next);
  }, []);

  const persistBudgets = useCallback(async (next: Budget[]) => {
    setBudgets(next);
    await writeCollection('budgets', next);
  }, []);

  const addTransaction = useCallback(
    async (draft: TransactionDraft) => {
      const now = new Date().toISOString();
      const transaction: Transaction = {
        id: generateId(),
        amount: Number(draft.amount) || 0,
        categoryId: draft.categoryId,
        date: draft.date,
        note: draft.note.trim(),
        paymentMethod: draft.paymentMethod,
        createdAt: now,
        updatedAt: now,
      };
      await persistTransactions([transaction, ...transactions]);
    },
    [transactions, persistTransactions]
  );

  const updateTransaction = useCallback(
    async (id: string, draft: TransactionDraft) => {
      const next = transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              amount: Number(draft.amount) || 0,
              categoryId: draft.categoryId,
              date: draft.date,
              note: draft.note.trim(),
              paymentMethod: draft.paymentMethod,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      await persistTransactions(next);
    },
    [transactions, persistTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await persistTransactions(transactions.filter((t) => t.id !== id));
    },
    [transactions, persistTransactions]
  );

  const getTransaction = useCallback(
    (id: string) => transactions.find((t) => t.id === id),
    [transactions]
  );

  const setBudget = useCallback(
    async (categoryId: string, monthlyLimit: number) => {
      const exists = budgets.some((b) => b.categoryId === categoryId);
      const next = exists
        ? budgets.map((b) => (b.categoryId === categoryId ? { ...b, monthlyLimit } : b))
        : [...budgets, { categoryId, monthlyLimit }];
      await persistBudgets(next);
    },
    [budgets, persistBudgets]
  );

  const getBudget = useCallback(
    (categoryId: string) => budgets.find((b) => b.categoryId === categoryId),
    [budgets]
  );

  const filterTransactions = useCallback(
    (filters: TransactionFilters) => {
      return transactions.filter((t) => {
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

  const monthlySpent = useCallback(
    (key: string = currentMonthKey()) => {
      return transactions
        .filter((t) => monthKey(t.date) === key)
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [transactions]
  );

  const categorySpent = useCallback(
    (categoryId: string, key: string = currentMonthKey()) => {
      return transactions
        .filter((t) => t.categoryId === categoryId && monthKey(t.date) === key)
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [transactions]
  );

  const monthlyBudgetTotal = useCallback(() => {
    return budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  }, [budgets]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      transactions,
      budgets,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getTransaction,
      setBudget,
      getBudget,
      filterTransactions,
      monthlySpent,
      categorySpent,
      monthlyBudgetTotal,
    }),
    [
      transactions,
      budgets,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getTransaction,
      setBudget,
      getBudget,
      filterTransactions,
      monthlySpent,
      categorySpent,
      monthlyBudgetTotal,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}

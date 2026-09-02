import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { readCollection, writeCollection } from '@/utils/storage';
import { currentMonthKey, monthKey } from '@/utils/format';
import type { Budget, Transaction, TransactionDraft, TransactionFilters } from '@/types';

/**
 * Budgets are persisted as a list of `{ categoryId, monthlyLimit }` rows, but
 * the app now tracks a single overall monthly budget rather than one per
 * category. That budget lives in the one row keyed by this id.
 */
export const TOTAL_BUDGET_KEY = 'total';

interface FinanceContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (draft: TransactionDraft) => Promise<void>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  filterTransactions: (filters: TransactionFilters) => Transaction[];
  monthlySpent: (key?: string) => number;
  categorySpent: (categoryId: string, key?: string) => number;
  totalBudget: number;
  setTotalBudget: (amount: number) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTransactions, storedBudgets] = await Promise.all([
        readCollection<Transaction>('transactions'),
        readCollection<Budget>('budgets'),
      ]);
      setTransactions(storedTransactions);
      transactionsRef.current = storedTransactions;

      // Older versions stored one budget row per category. Those rows are
      // meaningless now and would be counted on top of the overall budget, so
      // drop everything except the single "total" row.
      const totalRow = storedBudgets.find((b) => b.categoryId === TOTAL_BUDGET_KEY);
      const migrated = totalRow ? [totalRow] : [];
      setBudgets(migrated);
      if (migrated.length !== storedBudgets.length) {
        await writeCollection('budgets', migrated);
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

  // Always writes exactly one row, so repeated edits replace the budget rather
  // than accumulating alongside it.
  const setTotalBudget = useCallback(
    async (amount: number) => {
      const monthlyLimit = Number.isFinite(amount) && amount > 0 ? amount : 0;
      await persistBudgets([{ categoryId: TOTAL_BUDGET_KEY, monthlyLimit }]);
    },
    [persistBudgets]
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

  const totalBudget = useMemo(
    () => budgets.find((b) => b.categoryId === TOTAL_BUDGET_KEY)?.monthlyLimit ?? 0,
    [budgets]
  );

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
      categorySpent,
      totalBudget,
      setTotalBudget,
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
      categorySpent,
      totalBudget,
      setTotalBudget,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}

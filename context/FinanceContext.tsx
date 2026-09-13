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
import {
  advanceDate,
  alignToDay,
  convertAmount,
  currentMonthKey,
  formatCurrency,
  fromISODate,
  monthKey,
  toISODate,
} from '@/utils/format';
import { fetchRate } from '@/utils/exchangeRates';
import type {
  BackupPayload,
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
  addTransactions: (drafts: TransactionDraft[]) => Promise<void>;
  /** Inbox ids already turned into transactions, so a re-scan skips them. */
  importedSmsIds: Set<string>;
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
  addRecurringRule: (rule: Omit<RecurringRule, 'id' | 'createdAt' | 'anchorDay'>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  currency: Currency;
  /** Switches the display currency. Throws if the rate lookup fails, leaving the current currency in place. */
  setCurrencyCode: (code: string) => Promise<void>;
  /** Formats in the chosen currency. Screens use this rather than formatCurrency. */
  formatAmount: (value: number) => string;
  /** Converts a stored (INR) amount to the display currency, for pre-filling an editable amount field. */
  toDisplayAmount: (inrAmount: number) => number;
  clearAllData: () => Promise<void>;
  exportData: () => BackupPayload;
  /** Replaces all data with a validated backup payload. Amounts are already INR - no conversion. */
  restoreData: (payload: BackupPayload) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildTransaction(draft: TransactionDraft): Transaction {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type: draft.type,
    amount: Number(draft.amount) || 0,
    categoryId: draft.categoryId,
    date: draft.date,
    note: draft.note.trim(),
    paymentMethod: draft.paymentMethod,
    createdAt: now,
    updatedAt: now,
    ...(draft.smsId ? { smsId: draft.smsId } : {}),
  };
}

/** Rows written before income tracking existed, or from a foreign/corrupt row, are all expenses. */
function migrateTransaction(t: Transaction): Transaction {
  const type: TransactionType = t.type === 'income' ? 'income' : 'expense';
  return type === t.type ? t : { ...t, type };
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
      nextDate = advanceDate(nextDate, rule.frequency, rule.anchorDay);
      emitted += 1;
    }
    return nextDate === rule.nextDate ? rule : { ...rule, nextDate };
  });

  return { rules: advanced, generated };
}

/**
 * Gives a rule saved before `anchorDay` existed its real day back. Such a rule
 * may already have slid (the 31st became the 28th after February). The first
 * transaction it generated is dated on its start day - or, with none yet,
 * `nextDate` still is - so recover the day from there and move the pending
 * `nextDate` back onto it. Doubles as the guard for a backup's untrusted value.
 */
function withAnchorDay(rule: RecurringRule, transactions: Transaction[]): RecurringRule {
  const day = rule.anchorDay;
  if (day !== undefined && Number.isInteger(day) && day >= 1 && day <= 31) return rule;
  const firstDate = transactions.reduce(
    (first, t) => (t.recurringRuleId === rule.id && t.date < first ? t.date : first),
    rule.nextDate
  );
  const anchorDay = fromISODate(firstDate).getDate();
  const nextDate =
    rule.frequency === 'weekly' ? rule.nextDate : alignToDay(rule.nextDate, anchorDay);
  return { ...rule, anchorDay, nextDate };
}

/**
 * Migrates and catches up a raw (loaded-from-disk or restored-from-backup)
 * transactions/rules pair. The mount effect and `restoreData` both need this
 * exact sequence, so it lives in one place rather than two copies drifting
 * apart - a restored rule with a stale `nextDate` must catch up immediately
 * just like one loaded at startup does.
 */
function hydrateLoadedData(
  rawTransactions: Transaction[],
  rawRules: RecurringRule[],
  today: string
): { transactions: Transaction[]; recurringRules: RecurringRule[]; generated: Transaction[] } {
  const migrated = rawTransactions.map(migrateTransaction);
  const anchored = rawRules.map((rule) => withAnchorDay(rule, migrated));
  const { rules, generated } = catchUpRules(anchored, today);
  const transactions = generated.length
    ? [...generated, ...migrated].sort((a, b) => b.date.localeCompare(a.date))
    : migrated;
  return { transactions, recurringRules: rules, generated };
}

/**
 * Every stored amount (transactions, recurring rules, the budget) is always in
 * INR, regardless of `currency`. `currency` is purely a display preference:
 * `displayRate` (units of it per 1 INR) converts on the way out to a screen
 * and on the way in from one, so switching currency is a cheap rate fetch
 * instead of rewriting every record.
 */
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const [totalBudget, setTotalBudgetState] = useState(0);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [currencyCode, setCurrencyCodeState] = useState(DEFAULT_CURRENCY_CODE);
  const [displayRate, setDisplayRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTransactions, storedBudget, legacyBudgets, storedRules, storedCurrency, storedRate] =
        await Promise.all([
          readCollection<Transaction>('transactions'),
          readValue('budget'),
          readCollection<{ categoryId: string; monthlyLimit: number }>('budgets'),
          readCollection<RecurringRule>('recurring'),
          readValue('currency'),
          readValue('displayRate'),
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

      const { transactions: nextTransactions, recurringRules: rules, generated } =
        hydrateLoadedData(storedTransactions, storedRules, toISODate(new Date()));

      setTransactions(nextTransactions);
      transactionsRef.current = nextTransactions;
      setRecurringRules(rules);
      if (storedCurrency) setCurrencyCodeState(storedCurrency);

      if (storedCurrency && storedCurrency !== 'INR') {
        const cachedRate = Number(storedRate);
        if (Number.isFinite(cachedRate) && cachedRate > 0) setDisplayRate(cachedRate);
        // Refresh in the background so a stale cached rate can't block startup.
        fetchRate('INR', storedCurrency)
          .then((rate) => {
            setDisplayRate(rate);
            void writeValue('displayRate', String(rate));
          })
          .catch(() => {});
      }

      if (generated.length) await writeCollection('transactions', nextTransactions);
      // Rules keep their identity unless catch-up advanced them or an anchor
      // day was filled in, so this persists a backfill even with nothing due.
      if (generated.length || rules.some((rule, i) => rule !== storedRules[i])) {
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

  const toDisplayAmount = useCallback(
    (inrAmount: number) => convertAmount(inrAmount, displayRate),
    [displayRate]
  );
  // Not rounded: INR paise are too coarse for currencies worth less than a
  // rupee (1 INR ~ 1.7 JPY), so ¥100.00 would come back as ¥100.01.
  const toBaseAmount = useCallback(
    (displayAmount: number) => displayAmount / displayRate,
    [displayRate]
  );

  const addTransaction = useCallback(
    async (draft: TransactionDraft) => {
      const transaction = buildTransaction({
        ...draft,
        amount: String(toBaseAmount(Number(draft.amount) || 0)),
      });
      await persistTransactions((prev) => [transaction, ...prev]);
    },
    [persistTransactions, toBaseAmount]
  );

  /**
   * One write for the whole batch. The SMS import adds dozens at a time, and
   * looping `addTransaction` would serialise a full re-serialise of the store
   * per row. Unlike `addTransaction`, amounts here are NOT converted: the SMS
   * parser already extracts real INR figures from Indian bank alerts, so
   * they're in the base currency already, not the display currency.
   */
  const addTransactions = useCallback(
    async (drafts: TransactionDraft[]) => {
      if (!drafts.length) return;
      const created = drafts.map(buildTransaction);
      await persistTransactions((prev) =>
        [...created, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
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
                amount: toBaseAmount(Number(draft.amount) || 0),
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
    [persistTransactions, toBaseAmount]
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

  const setTotalBudget = useCallback(
    async (amount: number) => {
      const clamped = Number.isFinite(amount) && amount > 0 ? amount : 0;
      const next = toBaseAmount(clamped);
      setTotalBudgetState(next);
      await writeValue('budget', String(next));
    },
    [toBaseAmount]
  );

  const addRecurringRule = useCallback(
    async (rule: Omit<RecurringRule, 'id' | 'createdAt' | 'anchorDay'>) => {
      const created: RecurringRule = {
        ...rule,
        anchorDay: fromISODate(rule.nextDate).getDate(),
        amount: toBaseAmount(rule.amount),
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
    [recurringRules, persistRules, persistTransactions, toBaseAmount]
  );

  const deleteRecurringRule = useCallback(
    async (id: string) => {
      // Transactions it already generated stay: they are real money that moved.
      await persistRules(recurringRules.filter((r) => r.id !== id));
    },
    [recurringRules, persistRules]
  );

  const setCurrencyCode = useCallback(
    async (code: string) => {
      if (code === currencyCode) return;
      const rate = code === 'INR' ? 1 : await fetchRate('INR', code);

      setDisplayRate(rate);
      await writeValue('displayRate', String(rate));
      setCurrencyCodeState(code);
      await writeValue('currency', code);
    },
    [currencyCode]
  );

  const clearAllData = useCallback(async () => {
    await clearAll();
    transactionsRef.current = [];
    setTransactions([]);
    setTotalBudgetState(0);
    setRecurringRules([]);
  }, []);

  const exportData = useCallback(
    (): BackupPayload => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      recurringRules,
      totalBudget,
      currencyCode,
    }),
    [transactions, recurringRules, totalBudget, currencyCode]
  );

  /**
   * Full replace, not a merge: restoring is a deliberate "go back to this
   * snapshot" action (same posture as clearAllData), not an import. A rule's
   * nextDate goes through the same catch-up path the mount effect uses, so a
   * backup made weeks ago produces its overdue transactions immediately
   * instead of waiting for the next relaunch.
   *
   * The budget is written directly rather than through `setTotalBudget`:
   * that function converts its input from the display currency to INR, but a
   * backup's totalBudget is already INR, so routing it through there would
   * convert it a second time.
   */
  const restoreData = useCallback(
    async (payload: BackupPayload) => {
      const { transactions: nextTransactions, recurringRules: nextRules } = hydrateLoadedData(
        payload.transactions,
        payload.recurringRules,
        toISODate(new Date())
      );
      await persistTransactions(() => nextTransactions);
      await persistRules(nextRules);

      const nextBudget =
        Number.isFinite(payload.totalBudget) && payload.totalBudget > 0 ? payload.totalBudget : 0;
      setTotalBudgetState(nextBudget);
      await writeValue('budget', String(nextBudget));

      // The financial data above is the part that matters; if the currency's
      // rate can't be fetched right now, leave the display currency as-is
      // rather than treating a network hiccup as a failed restore.
      await setCurrencyCode(payload.currencyCode).catch(() => {});
    },
    [persistTransactions, persistRules, setCurrencyCode]
  );

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

  // ponytail: derived, so deleting an imported row makes the next scan offer it
  // again. Persist a dismissed-id set if that turns out to be irritating.
  const importedSmsIds = useMemo(
    () => new Set(transactions.map((t) => t.smsId).filter((id): id is string => Boolean(id))),
    [transactions]
  );

  const currency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  const formatAmount = useCallback(
    (value: number) => formatCurrency(toDisplayAmount(value), currency),
    [toDisplayAmount, currency]
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      transactions,
      isLoading,
      addTransaction,
      addTransactions,
      importedSmsIds,
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
      toDisplayAmount,
      clearAllData,
      exportData,
      restoreData,
    }),
    [
      transactions,
      isLoading,
      addTransaction,
      addTransactions,
      importedSmsIds,
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
      toDisplayAmount,
      clearAllData,
      exportData,
      restoreData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}

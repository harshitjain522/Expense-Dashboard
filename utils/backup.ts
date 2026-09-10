import type { BackupPayload, RecurringRule, Transaction } from '@/types';

/**
 * Validates a parsed JSON backup file. Deliberately permissive on row shape:
 * unknown categoryId/paymentMethod values already fall back gracefully
 * elsewhere (getCategory, chip equality checks), so only the fields that
 * would silently corrupt totals (version, array shape, amount, budget,
 * currency) are checked here.
 */
export function parseBackupPayload(data: unknown): BackupPayload | null {
  if (!data || typeof data !== 'object') return null;
  const { version, transactions, recurringRules, totalBudget, currencyCode, exportedAt } =
    data as Record<string, unknown>;

  if (version !== 1) return null;
  if (!Array.isArray(transactions) || !Array.isArray(recurringRules)) return null;
  if (typeof totalBudget !== 'number' || !Number.isFinite(totalBudget)) return null;
  if (typeof currencyCode !== 'string' || !currencyCode.trim()) return null;

  return {
    version: 1,
    exportedAt: typeof exportedAt === 'string' ? exportedAt : new Date().toISOString(),
    transactions: transactions
      .filter((t): t is Transaction => !!t && typeof t === 'object')
      .map((t) => ({ ...t, amount: Number(t.amount) || 0 })),
    recurringRules: recurringRules.filter(
      (r): r is RecurringRule => !!r && typeof r === 'object'
    ),
    totalBudget,
    currencyCode,
  };
}

export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

/** Money out vs money in. Everything budget-related counts expenses only. */
export type TransactionType = 'expense' | 'income';

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // ISO 8601 date string
  note: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  /** Set when the row was generated from a recurring rule. */
  recurringRuleId?: string;
  /** Inbox id of the SMS this was imported from. Blocks a second import. */
  smsId?: string;
}

export interface TransactionDraft {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  paymentMethod: PaymentMethod;
  smsId?: string;
}

/**
 * A template that mints transactions on a schedule. `nextDate` is the earliest
 * occurrence not yet generated, so catching up after the app was closed for a
 * while is just "emit and advance until nextDate passes today".
 */
export interface RecurringRule {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  paymentMethod: PaymentMethod;
  frequency: RecurrenceFrequency;
  nextDate: string;
  /**
   * Day of the month the rule is meant to land on. `nextDate` can't carry it
   * alone: after February, a rule for the 31st sits on the 28th. Optional
   * because rules saved before it existed lack it; loading fills it in.
   */
  anchorDay?: number;
  createdAt: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  query?: string;
  type?: TransactionType;
}

/** Full-data snapshot for manual backup/restore. Amounts are in INR, same as storage. */
export interface BackupPayload {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  totalBudget: number;
  currencyCode: string;
}

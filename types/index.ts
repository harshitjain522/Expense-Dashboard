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
}

export interface TransactionDraft {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  paymentMethod: PaymentMethod;
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
  createdAt: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  query?: string;
  type?: TransactionType;
}

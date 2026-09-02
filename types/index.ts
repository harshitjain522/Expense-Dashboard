export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO 8601 date string
  note: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  categoryId: string;
  monthlyLimit: number;
}

export interface TransactionDraft {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  paymentMethod: PaymentMethod;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  query?: string;
}

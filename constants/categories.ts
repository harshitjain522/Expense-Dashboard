import type { Category, TransactionType } from '@/types';

/**
 * Category hues sit in one saturation and value band so twelve of them can
 * share a screen without any one shouting. They are graphic fills - never the
 * only carrier of meaning - so each category keeps its icon and label too.
 */

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#C25E3A' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#5F8C3F' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#3B7A8C' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#A8497A' },
  { id: 'bills', label: 'Bills & Utilities', icon: '💡', color: '#B08A2E' },
  { id: 'rent', label: 'Rent & Housing', icon: '🏠', color: '#6B5FA8' },
  { id: 'health', label: 'Health & Fitness', icon: '💊', color: '#B24B4B' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#3E7F76' },
  { id: 'education', label: 'Education', icon: '📚', color: '#4A6BA8' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#2F87A8' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '🔁', color: '#8A5AA0' },
  { id: 'other', label: 'Other', icon: '📦', color: '#6E756C' },
];

/** Kept separate: "Salary" makes no sense in an expense breakdown, and vice versa. */
export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', icon: '💼', color: '#2E7D5B' },
  { id: 'freelance', label: 'Freelance', icon: '🧑‍💻', color: '#2F87A8' },
  { id: 'business', label: 'Business', icon: '🏪', color: '#6B5FA8' },
  { id: 'investments', label: 'Investments', icon: '📈', color: '#5F8C3F' },
  { id: 'refund', label: 'Refund', icon: '↩️', color: '#B08A2E' },
  { id: 'gift', label: 'Gift', icon: '🎁', color: '#A8497A' },
  { id: 'income-other', label: 'Other', icon: '💰', color: '#6E756C' },
];

export function categoriesFor(type: TransactionType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : CATEGORIES;
}

export const DEFAULT_CATEGORY_ID: Record<TransactionType, string> = {
  expense: 'food',
  income: 'salary',
};

export const ALL_CATEGORIES: Category[] = [...CATEGORIES, ...INCOME_CATEGORIES];

const CATEGORY_MAP: Record<string, Category> = ALL_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<string, Category>
);

export function getCategory(id: string): Category {
  return CATEGORY_MAP[id] ?? CATEGORY_MAP.other;
}

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as const;

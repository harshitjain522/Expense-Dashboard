import type { Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#F97316' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#22C55E' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { id: 'bills', label: 'Bills & Utilities', icon: '💡', color: '#EAB308' },
  { id: 'rent', label: 'Rent & Housing', icon: '🏠', color: '#8B5CF6' },
  { id: 'health', label: 'Health & Fitness', icon: '💊', color: '#EF4444' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#06B6D4' },
  { id: 'education', label: 'Education', icon: '📚', color: '#6366F1' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#0EA5E9' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '🔁', color: '#A855F7' },
  { id: 'other', label: 'Other', icon: '📦', color: '#6B7280' },
];

export const CATEGORY_MAP: Record<string, Category> = CATEGORIES.reduce(
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

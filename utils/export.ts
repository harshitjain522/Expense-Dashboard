import { getCategory } from '@/constants/categories';
import type { Transaction } from '@/types';

const HEADERS = ['Date', 'Type', 'Category', 'Amount', 'Payment method', 'Note'];

/**
 * RFC 4180 quoting. Notes are free text and routinely contain commas, quotes
 * and newlines, any of which would otherwise shift every later column.
 */
function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) =>
      [
        t.date,
        t.type,
        getCategory(t.categoryId).label,
        String(t.amount),
        t.paymentMethod,
        t.note,
      ]
        .map(escapeCsv)
        .join(',')
    );
  return [HEADERS.map(escapeCsv).join(','), ...rows].join('\n');
}

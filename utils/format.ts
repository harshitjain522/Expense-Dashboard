import type { Currency } from '@/constants/currencies';
import type { RecurrenceFrequency } from '@/types';

export function formatCurrency(value: number, currency: Currency): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${currency.symbol}${abs.toLocaleString(currency.locale, {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formats a Date as YYYY-MM-DD using local calendar fields. Using
 * `toISOString().slice(0, 10)` instead would convert to UTC first, landing on
 * the wrong day for part of every day in any timezone offset from UTC.
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a Date at local midnight. */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function currentMonthKey(): string {
  return monthKey(toISODate(new Date()));
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Short month name for chart axes, e.g. "Sep". */
export function monthLabelShort(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

/** Moves a YYYY-MM key by `delta` months, rolling the year over as needed. */
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  return monthKey(toISODate(new Date(year, month - 1 + delta, 1)));
}

/** Abbreviates large amounts for chart axis ticks, e.g. 1500 -> "1.5k". */
export function compactAmount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(Math.round(value));
}

/**
 * Moves an ISO date forward by one recurrence step. Months and years go via the
 * 1st and then clamp: adding a month to the 31st with a plain `setMonth` spills
 * into the month after next, so a rule set on the 31st would drift off calendar.
 */
export function advanceDate(iso: string, frequency: RecurrenceFrequency): string {
  const date = fromISODate(iso);
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
    return toISODate(date);
  }
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + (frequency === 'monthly' ? 1 : 12));
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDayOfMonth));
  return toISODate(date);
}

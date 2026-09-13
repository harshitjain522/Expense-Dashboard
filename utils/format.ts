import type { Currency } from '@/constants/currencies';
import type { RecurrenceFrequency } from '@/types';

export function formatCurrency(value: number, currency: Currency): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  // Whole rupees for the base currency; converted amounts keep their cents,
  // where a rounded dollar can be off by eighty-odd rupees.
  const digits = currency.code === 'INR' ? 0 : 2;
  return `${sign}${currency.symbol}${abs.toLocaleString(currency.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Rounds to 2 decimals for display, clearing float noise like 10 * 1.005. */
export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
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

/**
 * Abbreviates amounts for chart axis ticks. Groups the Indian way, because the
 * amounts themselves already do: `toLocaleString('en-IN')` reads 184240 as
 * 1,84,240, so an axis calling that 184k would be counting in a different
 * system to the figure beside it.
 */
export function compactAmount(value: number): string {
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (value >= 10000000) return `${trim(value / 10000000)}Cr`;
  if (value >= 100000) return `${trim(value / 100000)}L`;
  if (value >= 1000) return `${trim(value / 1000)}k`;
  return String(Math.round(value));
}

/**
 * Moves an ISO date forward by one recurrence step. Months and years go via the
 * 1st and then clamp: adding a month to the 31st with a plain `setMonth` spills
 * into the month after next. The clamp targets `anchorDay`, not the day of
 * `iso`: stepping from an already-clamped Feb 28 would otherwise land every
 * later month on the 28th too.
 */
export function advanceDate(
  iso: string,
  frequency: RecurrenceFrequency,
  anchorDay = fromISODate(iso).getDate()
): string {
  if (frequency === 'weekly') {
    const date = fromISODate(iso);
    date.setDate(date.getDate() + 7);
    return toISODate(date);
  }
  return monthsLater(iso, frequency === 'monthly' ? 1 : 12, anchorDay);
}

/** Same month as `iso`, on `day` clamped to that month's length. */
export function alignToDay(iso: string, day: number): string {
  return monthsLater(iso, 0, day);
}

function monthsLater(iso: string, months: number, day: number): string {
  const date = fromISODate(iso);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDayOfMonth));
  return toISODate(date);
}

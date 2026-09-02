import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin persistence layer over AsyncStorage. Keeping all reads/writes behind
 * this module means swapping in SQLite (or any other store) later only
 * requires changing this file.
 */

const STORAGE_KEYS = {
  transactions: 'finance:transactions',
  budgets: 'finance:budgets',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

export async function readCollection<T>(key: StorageKey): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.warn(`[storage] failed to read "${key}"`, error);
    return [];
  }
}

export async function writeCollection<T>(key: StorageKey, value: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] failed to write "${key}"`, error);
  }
}

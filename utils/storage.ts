import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin persistence layer over AsyncStorage. Keeping all reads/writes behind
 * this module means swapping in SQLite (or any other store) later only
 * requires changing this file.
 */

const STORAGE_KEYS = {
  transactions: 'finance:transactions',
  budgets: 'finance:budgets',
  recurring: 'finance:recurring',
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

/** Single scalar settings, stored alongside the collections above. */
const VALUE_KEYS = {
  theme: 'finance:theme',
  biometricLock: 'finance:biometric-lock',
  currency: 'finance:currency',
} as const;

export type ValueKey = keyof typeof VALUE_KEYS;

export async function readValue(key: ValueKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(VALUE_KEYS[key]);
  } catch (error) {
    console.warn(`[storage] failed to read "${key}"`, error);
    return null;
  }
}

export async function writeValue(key: ValueKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(VALUE_KEYS[key], value);
  } catch (error) {
    console.warn(`[storage] failed to write "${key}"`, error);
  }
}

/**
 * Wipes the records only. Preferences under VALUE_KEYS survive on purpose:
 * "clear data" should not silently switch off someone's biometric lock or
 * throw away their theme and currency choice.
 */
export async function clearAll(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.warn('[storage] failed to clear', error);
  }
}

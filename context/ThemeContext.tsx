import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';

import {
  PALETTES,
  paletteVars,
  type ColorScheme,
  type Palette,
  type ThemePreference,
} from '@/constants/theme';
import { readValue, writeValue } from '@/utils/storage';

interface ThemeContextValue {
  /** What the user picked: follow the device, or pin light/dark. */
  preference: ThemePreference;
  /** What that resolves to right now. */
  scheme: ColorScheme;
  /** For the inline styles NativeWind classes cannot reach (charts, tab bar). */
  colors: Palette;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setStoredPreference] = useState<ThemePreference>('system');
  const systemScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const stored = await readValue('theme');
      if (!isPreference(stored)) return;
      setStoredPreference(stored);
      Appearance.setColorScheme(stored === 'system' ? null : stored);
    })();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setStoredPreference(next);
    // Also drives the native side: keyboard appearance, system text selection.
    Appearance.setColorScheme(next === 'system' ? null : next);
    await writeValue('theme', next);
  }, []);

  const scheme: ColorScheme = preference === 'system' ? systemScheme ?? 'light' : preference;
  const colors = PALETTES[scheme];

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, colors, setPreference }),
    [preference, scheme, colors, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={vars(paletteVars(colors))} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

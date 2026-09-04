/**
 * Both palettes live here so the NativeWind classes and the handful of inline
 * `style={{ color: ... }}` sites (charts, the tab bar, placeholders) read the
 * same values. `paletteVars` feeds NativeWind through `vars()` at the root, so
 * every existing `bg-surface` / `text-ink` class follows the active scheme
 * without needing a `dark:` variant of its own.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

// Listed once so a key missing from either palette is a type error.
export type PaletteKey =
  | 'accent'
  | 'accent-light'
  | 'accent-dark'
  | 'surface'
  | 'background'
  | 'border'
  | 'ink'
  | 'ink-muted'
  | 'ink-faint'
  | 'danger'
  | 'danger-light'
  | 'warning'
  | 'warning-light'
  | 'success'
  | 'success-light';

export type Palette = Record<PaletteKey, string>;

export const PALETTES: Record<ColorScheme, Palette> = {
  light: {
    accent: '#4F46E5',
    'accent-light': '#EEF2FF',
    'accent-dark': '#3730A3',
    surface: '#FFFFFF',
    background: '#F7F7F9',
    border: '#E7E7EC',
    ink: '#111114',
    'ink-muted': '#6B6B76',
    'ink-faint': '#A0A0AC',
    danger: '#DC2626',
    'danger-light': '#FEF2F2',
    warning: '#D97706',
    'warning-light': '#FFFBEB',
    success: '#059669',
    'success-light': '#ECFDF5',
  },
  dark: {
    accent: '#818CF8',
    'accent-light': '#1E1B4B',
    'accent-dark': '#A5B4FC',
    surface: '#17171C',
    background: '#0B0B0F',
    border: '#2A2A32',
    ink: '#F2F2F5',
    'ink-muted': '#9B9BA6',
    'ink-faint': '#6B6B76',
    danger: '#F87171',
    'danger-light': '#2A1516',
    warning: '#FBBF24',
    'warning-light': '#2A2113',
    success: '#34D399',
    'success-light': '#10241C',
  },
};

export function paletteVars(palette: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [`--color-${name}`, value])
  );
}

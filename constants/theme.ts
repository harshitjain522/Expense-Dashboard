/**
 * Both palettes live here so the NativeWind classes and the handful of inline
 * `style={{ color: ... }}` sites (charts, the tab bar, placeholders) read the
 * same values. `paletteVars` feeds NativeWind through `vars()` at the root, so
 * every existing `bg-surface` / `text-ink` class follows the active scheme
 * without needing a `dark:` variant of its own.
 *
 * Colours are drawn from Indian currency notes rather than a framework ramp:
 * the olive-green of the 500 and the saffron of the 200. Green carries the
 * whole interface; `flag` is the one loud colour and has exactly two jobs,
 * the add button and going over budget.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

// Listed once so a key missing from either palette is a type error.
export type PaletteKey =
  | 'accent'
  | 'accent-light'
  | 'flag'
  | 'on-accent'
  | 'surface'
  | 'background'
  | 'border'
  | 'ink'
  | 'ink-muted'
  | 'ink-faint'
  | 'danger'
  | 'danger-light'
  | 'success';

export type Palette = Record<PaletteKey, string>;

export const PALETTES: Record<ColorScheme, Palette> = {
  light: {
    accent: '#1F5B45',
    'accent-light': '#DCE5DC',
    flag: '#B85410',
    'on-accent': '#FFFFFF',
    surface: '#F8F9F5',
    background: '#EBEDE6',
    border: '#C9CFC0',
    ink: '#14211B',
    'ink-muted': '#54605A',
    'ink-faint': '#737E77',
    danger: '#A33A22',
    'danger-light': '#F2E2DB',
    success: '#1F6B4A',
  },
  dark: {
    accent: '#62BE97',
    'accent-light': '#16261F',
    flag: '#E8873A',
    'on-accent': '#0D1310',
    surface: '#17201A',
    background: '#0D1310',
    border: '#26302A',
    ink: '#E9EEE6',
    'ink-muted': '#96A29A',
    'ink-faint': '#6E7B73',
    danger: '#E4785A',
    'danger-light': '#2A1712',
    success: '#62BE97',
  },
};

export function paletteVars(palette: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [`--color-${name}`, value])
  );
}

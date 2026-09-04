/** @type {import('tailwindcss').Config} */
// Colours resolve through CSS variables set by ThemeProvider's `vars()` call,
// so a class like `bg-surface` follows the active scheme with no `dark:` twin.
//
// React Native has no font synthesis and no family stacks: each weight is its
// own registered family. So weight lives in the family name (`font-strong`)
// rather than in a separate `font-semibold`, which would ask Android to fake
// a bold it doesn't have.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces_700Bold'],
        body: ['IBMPlexSans_400Regular'],
        ui: ['IBMPlexSans_500Medium'],
        strong: ['IBMPlexSans_600SemiBold'],
        num: ['IBMPlexMono_500Medium'],
        'num-strong': ['IBMPlexMono_600SemiBold'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
        },
        'on-accent': 'var(--color-on-accent)',
        flag: 'var(--color-flag)',
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        border: 'var(--color-border)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          faint: 'var(--color-ink-faint)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light: 'var(--color-danger-light)',
        },
        success: 'var(--color-success)',
      },
    },
  },
  plugins: [],
};

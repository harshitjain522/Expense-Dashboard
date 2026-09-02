/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#4F46E5',
          light: '#EEF2FF',
          dark: '#3730A3',
        },
        surface: '#FFFFFF',
        background: '#F7F7F9',
        border: '#E7E7EC',
        ink: {
          DEFAULT: '#111114',
          muted: '#6B6B76',
          faint: '#A0A0AC',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
        },
        success: {
          DEFAULT: '#059669',
          light: '#ECFDF5',
        },
      },
    },
  },
  plugins: [],
};

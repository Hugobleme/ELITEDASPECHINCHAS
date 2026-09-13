import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Core bright orange (Pechinchou style)
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#f97316',
        },
        discount: {
          badge: '#ef4444',
          badgeText: '#ffffff',
          green: '#10b981',
          greenDark: '#059669',
        },
      },
      boxShadow: {
        'card-hover': '0 12px 30px -10px rgba(0, 0, 0, 0.12), 0 4px 10px -5px rgba(0, 0, 0, 0.04)',
        'card-hover-dark': '0 12px 30px -10px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(249, 115, 22, 0.15)',
        'glow-brand': '0 0 25px -5px rgba(249, 115, 22, 0.4)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'pulse-slow': 'pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;

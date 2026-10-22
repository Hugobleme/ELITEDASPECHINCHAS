import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '420px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Royal Gold
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b',
        },
        gold: {
          50: '#fffdf0',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          metallic: '#ffd700',
        },
        obsidian: {
          800: '#1a1a22',
          850: '#14141c',
          900: '#0e0e14',
          950: '#07070a',
          DEFAULT: '#07070a',
        },
        graphite: {
          800: '#1a1a20',
          850: '#14141a',
          900: '#0f0f13',
          950: '#070709',
        },
        slate: {
          850: '#14141a',
          925: '#0f0f13',
          950: '#070709',
        },
        discount: {
          badge: '#f59e0b',
          badgeText: '#0a0a0c',
          green: '#10b981',
          greenDark: '#059669',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        card: '0 2px 10px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 16px 32px -8px rgba(245, 158, 11, 0.16), 0 4px 12px -3px rgba(0, 0, 0, 0.06)',
        'card-hover-dark': '0 16px 36px -10px rgba(0, 0, 0, 0.9), 0 0 24px -2px rgba(245, 158, 11, 0.25)',
        'glow-brand': '0 0 28px -4px rgba(245, 158, 11, 0.55)',
        'glow-gold': '0 0 28px -4px rgba(251, 191, 36, 0.55)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.35)',
        modal: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.15)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'pulse-slow': 'pulseSlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;

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
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Electric Violet
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          DEFAULT: '#7c3aed',
        },
        neon: {
          fuchsia: '#d946ef',
          magenta: '#ec4899',
          pink: '#f43f5e',
          violet: '#8b5cf6',
        },
        graphite: {
          800: '#1f1f28',
          850: '#16161e',
          900: '#111116',
          950: '#09090c',
        },
        slate: {
          850: '#16161e', // Substitui tom azulado por grafite puro
          925: '#111116',
          950: '#09090c',
        },
        discount: {
          badge: '#ec4899',
          badgeText: '#ffffff',
          green: '#10b981',
          greenDark: '#059669',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        card: '0 2px 10px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 16px 32px -8px rgba(124, 58, 237, 0.12), 0 4px 12px -3px rgba(0, 0, 0, 0.06)',
        'card-hover-dark': '0 16px 36px -10px rgba(0, 0, 0, 0.85), 0 0 24px -2px rgba(139, 92, 246, 0.25)',
        'glow-brand': '0 0 28px -4px rgba(139, 92, 246, 0.55)',
        'glow-magenta': '0 0 28px -4px rgba(236, 72, 153, 0.55)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.35)',
        modal: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
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

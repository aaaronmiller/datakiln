/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Design Token Colors */
        dk: {
          'bg-primary': 'var(--dk-bg-primary)',
          'bg-secondary': 'var(--dk-bg-secondary)',
          'bg-elevated': 'var(--dk-bg-elevated)',
          'bg-glass': 'var(--dk-bg-glass)',
          'bg-glass-light': 'var(--dk-bg-glass-light)',
          surface: 'var(--dk-surface)',
          'surface-hover': 'var(--dk-surface-hover)',
          'surface-active': 'var(--dk-surface-active)',
          'surface-secondary': 'var(--dk-surface-secondary)',
          'surface-border': 'var(--dk-surface-border)',
          'text-primary': 'var(--dk-text-primary)',
          'text-secondary': 'var(--dk-text-secondary)',
          'text-muted': 'var(--dk-text-muted)',
          accent: 'var(--dk-accent)',
          'accent-hover': 'var(--dk-accent-hover)',
          'accent-active': 'var(--dk-accent-active)',
          'accent-subtle': 'var(--dk-accent-subtle)',
          'accent-border': 'var(--dk-accent-border)',
          success: {
            DEFAULT: 'var(--dk-success)',
            bg: 'var(--dk-success-bg)',
            border: 'var(--dk-success-border)',
          },
          warning: {
            DEFAULT: 'var(--dk-warning)',
            bg: 'var(--dk-warning-bg)',
            border: 'var(--dk-warning-border)',
          },
          error: {
            DEFAULT: 'var(--dk-error)',
            bg: 'var(--dk-error-bg)',
            border: 'var(--dk-error-border)',
          },
          info: {
            DEFAULT: 'var(--dk-info)',
            bg: 'var(--dk-info-bg)',
            border: 'var(--dk-info-border)',
          },
        },

        /* Legacy Colors — kept for compatibility */
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Roboto Mono',
          'Consolas',
          'Courier New',
          'monospace',
        ],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1.2' }],
        xs: ['0.75rem', { lineHeight: '1.2' }],
        sm: ['0.8125rem', { lineHeight: '1.3' }],
        base: ['0.875rem', { lineHeight: '1.5' }],
        lg: ['1rem', { lineHeight: '1.4' }],
        xl: ['1.125rem', { lineHeight: '1.3' }],
        '2xl': ['1.25rem', { lineHeight: '1.25' }],
        '3xl': ['1.5rem', { lineHeight: '1.2' }],
        '4xl': ['1.875rem', { lineHeight: '1.15' }],
      },

      spacing: {
        '4.5': '18px',
        '18': '72px',
        '88': '352px',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        'dk-sm': 'var(--dk-shadow-sm)',
        'dk': 'var(--dk-shadow)',
        'dk-md': 'var(--dk-shadow-md)',
        'dk-lg': 'var(--dk-shadow-lg)',
        'dk-xl': 'var(--dk-shadow-xl)',
        'dk-glow': 'var(--dk-shadow-glow)',
        'dk-glow-lg': 'var(--dk-shadow-glow-lg)',
      },

      /* Custom Animations */
      animation: {
        'fade-in': 'dk-fade-in 0.4s ease-out',
        'slide-up': 'dk-slide-up 0.3s ease-out',
        'slide-in-right': 'dk-slide-in-right 0.3s ease-out',
        'scale-in': 'dk-scale-in 0.2s ease-out',
        'shake': 'dk-shake 0.5s ease-in-out',
        'pulse-ring': 'dk-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-error': 'dk-pulse-error 1.5s ease-in-out infinite',
        'shimmer': 'dk-shimmer 1.5s ease-in-out infinite',
      },

      keyframes: {
        'dk-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'dk-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'dk-slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'dk-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'dk-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'dk-pulse-ring': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.25)' },
        },
        'dk-pulse-error': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'dk-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },

      /* Transition Timing */
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },

      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '450': '450ms',
      },

      /* Backdrop Blur */
      backdropBlur: {
        'xs': '2px',
      },

      /* Background Opacity */
      backgroundOpacity: {
        '5': '0.05',
        '10': '0.1',
        '15': '0.15',
        '20': '0.2',
        '25': '0.25',
      },
    },
  },
  plugins: [],
}

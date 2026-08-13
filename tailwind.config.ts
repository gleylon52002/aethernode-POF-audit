import type { Config } from 'tailwindcss';

// AetherNode Secure Browser — Tasarım Sistemi
// Dark Mode + Glassmorphism. Renkler marka kimliğine sabitlenmiştir.
const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marka — runtime'da --brand-* CSS variable ile değişir (Madde 1)
        brand: {
          DEFAULT: 'var(--brand-500, #7C3AED)',
          50: 'var(--brand-50, #F5F1FF)',
          100: 'var(--brand-100, #EDE4FF)',
          200: 'var(--brand-200, #D6C2FF)',
          300: 'var(--brand-300, #B79AFF)',
          400: 'var(--brand-400, #9B6BFF)',
          500: 'var(--brand-500, #7C3AED)',
          600: 'var(--brand-600, #6726D9)',
          700: 'var(--brand-700, #511BB0)',
          800: 'var(--brand-800, #3C1286)',
          900: 'var(--brand-900, #280B5C)',
        },
        accent: {
          DEFAULT: '#3B82F6',
          500: '#3B82F6',
          600: '#2563EB',
        },
        // Arka plan
        bg: {
          base: '#0B0B0F',
          surface: '#111118',
          elevated: '#16161F',
          glass: 'rgba(22, 22, 31, 0.55)',
        },
        // Metin
        fg: {
          DEFAULT: '#EDEDF2',
          muted: '#9A9AA8',
          subtle: '#6E6E7C',
        },
        // Anlamsal
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
        'glass-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,58,237,0.35), 0 8px 30px rgba(124,58,237,0.25)',
        glass:
          '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-up': 'slide-up 220ms ease-out both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
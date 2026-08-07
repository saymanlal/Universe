/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep-space neutral palette (Linear / Figma inspired)
        space: {
          950: '#05060a',
          900: '#0a0c12',
          850: '#0e1017',
          800: '#12141d',
          750: '#171a24',
          700: '#1d212e',
          600: '#262b3a',
          500: '#333a4d',
          400: '#4a5266',
          300: '#6b7488',
        },
        accent: {
          DEFAULT: '#6d8bff',
          soft: '#8fa4ff',
          dim: '#3d4d8f',
          glow: '#a9bbff',
        },
        nebula: {
          pink: '#ff6ec7',
          violet: '#a56cff',
          cyan: '#4fd1ff',
          amber: '#ffb347',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 8px 32px -8px rgba(0,0,0,0.6)',
        glow: '0 0 24px -4px rgba(109,139,255,0.5)',
        'glow-lg': '0 0 40px -4px rgba(109,139,255,0.6)',
        'glow-nebula': '0 0 32px -4px rgba(165,108,255,0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

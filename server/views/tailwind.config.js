/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        'bg-card': 'rgb(var(--color-card) / <alpha-value>)',
        'bg-card2': 'rgb(var(--color-card2) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-hover': 'rgb(var(--color-border-hover) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'text-dim': 'rgb(var(--color-text-dim) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accent2: 'rgb(var(--color-accent2) / <alpha-value>)',
        green: 'rgb(var(--color-green) / <alpha-value>)',
        red: 'rgb(var(--color-red) / <alpha-value>)',
        yellow: 'rgb(var(--color-yellow) / <alpha-value>)',
        orange: 'rgb(var(--color-orange) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      maxWidth: {
        container: '1600px',
      },
    },
  },
  plugins: [],
};

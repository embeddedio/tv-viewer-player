/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#030712',
        'bg-card': '#0f172a',
        'bg-card2': '#111827',
        border: 'rgba(255,255,255,0.1)',
        'border-hover': 'rgba(255,255,255,0.2)',
        text: '#f1f5f9',
        'text-muted': '#94a3b8',
        'text-dim': '#64748b',
        accent: '#22d3ee',
        accent2: '#2563eb',
        green: '#4ade80',
        red: '#ef4444',
        yellow: '#fbbf24',
        orange: '#fb923c',
      },
      maxWidth: {
        container: '1600px',
      },
    },
  },
  plugins: [],
};

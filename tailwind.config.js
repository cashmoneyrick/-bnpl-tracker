/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dark: {
          bg: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
          card: 'rgb(var(--color-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-hover-rgb) / <alpha-value>)',
        },
        terminal: {
          amber: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          cyan: '#00BBFF',
          green: '#00D26A',
          red: '#FF3B3B',
          text: 'rgb(var(--color-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-muted-rgb) / <alpha-value>)',
        },
        platform: {
          afterpay: '#B2FCE4',
          sezzle: '#8832D4',
          klarna: '#FFB3C7',
          zip: '#00A9E0',
          four: '#FF6B35',
          affirm: '#0FA0EA',
        },
        status: {
          nominal: '#00D26A',
          elevated: '#FFB000',
          critical: '#FF3B3B',
        },
      },
      fontSize: {
        '2xs': '0.6875rem', // 11px
      },
    },
  },
  plugins: [],
}

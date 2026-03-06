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
          bg: '#0B0E11',
          card: '#0F1215',
          border: '#1E2328',
          hover: '#181D22',
        },
        terminal: {
          amber: '#FFB000',
          cyan: '#00BBFF',
          green: '#00D26A',
          red: '#FF3B3B',
          text: '#C8CCD0',
          muted: '#6B7280',
        },
        platform: {
          afterpay: '#B2FCE4',
          sezzle: '#8832D4',
          klarna: '#FFB3C7',
          zip: '#00A9E0',
          four: '#FF6B35',
          affirm: '#0FA0EA',
        },
      },
      fontSize: {
        '2xs': '0.6875rem', // 11px
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0a',
          card: '#141414',
          border: '#262626',
          hover: '#1f1f1f',
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
    },
  },
  plugins: [],
}

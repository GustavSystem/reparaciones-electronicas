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
        "primary": "#135bec",
        "primary-hover": "#1d4ed8",
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        "surface-dark": "#1a2332",
        "border-dark": "#232f48",
        "panel-dark": "#161b26",
        "text-secondary": "#92a4c9",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%) skewX(12deg)' },
          '100%': { transform: 'translateX(200%) skewX(12deg)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
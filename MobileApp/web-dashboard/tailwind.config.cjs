/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7f1',
          100: '#d9eadb',
          200: '#b3d5b7',
          300: '#7ab680',
          400: '#4e9455',
          500: '#357a3c',
          600: '#2C5530',
          700: '#234428',
          800: '#1a3320',
          900: '#112218',
        },
        primary: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e2d9cc',
          300: '#ccbf9d',
          400: '#a6906e',
          500: '#7a6642',
          600: '#4e3a21',
          700: '#3a2d1e',
          800: '#1e0d04',
          900: '#150a03',
        },
        accent: {
          50: '#fdfbf3',
          100: '#faf5e1',
          200: '#f5ecc4',
          300: '#f1d886',
          400: '#dbc06a',
          500: '#c4a54e',
          600: '#a67c36',
          700: '#85632b',
          800: '#654a20',
          900: '#453317',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
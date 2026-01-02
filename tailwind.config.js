/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#FDF8F3',
          100: '#F5E6D3',
          200: '#E8CBA7',
          300: '#D4A574',
          400: '#C08552',
          500: '#8B4513', // 메인 브라운
          600: '#723A0F',
          700: '#5A2D0C',
          800: '#422108',
          900: '#2A1505',
        },
      },
    },
  },
  plugins: [],
};

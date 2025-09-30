/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'float-and-pulse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-6px) scale(1.05)' },
        },
      },
      animation: {
        'float-and-pulse': 'float-and-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('standalone', '@media (display-mode: standalone)');
    }
  ],
}
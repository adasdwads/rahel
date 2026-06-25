/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rahel: {
          bg: '#1A1A1A',
          surface: '#2A2A2A',
          elevated: '#333333',
          border: '#444444',
          accent: '#007BFF',
          'accent-hover': '#0056b3',
          'accent-glow': 'rgba(0, 123, 255, 0.15)',
          success: '#28A745',
          warning: '#FFC107',
          danger: '#DC3545',
          'text-primary': '#FFFFFF',
          'text-secondary': '#B0B0B0',
          'text-muted': '#777777',
        },
      },
      fontFamily: {
        arabic: ['Tahoma', 'Arial', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Tahoma', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'encrypt': 'encrypt 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 123, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 123, 255, 0.6)' },
        },
        encrypt: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

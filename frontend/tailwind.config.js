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
        background: {
          light: '#f8fafc',
          dark: '#0b0f19',
        },
        surface: {
          light: '#ffffff',
          dark: '#161d30',
          borderLight: '#e2e8f0',
          borderDark: '#23304d',
        },
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        accent: {
          blue: '#3b82f6',
          teal: '#14b8a6',
          pink: '#ec4899',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(139, 92, 246, 0.25)',
        'glow-accent': '0 0 15px rgba(59, 130, 246, 0.25)',
      }
    },
  },
  plugins: [],
}

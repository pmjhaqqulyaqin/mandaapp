/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  safelist: [
    // Gradient directions used in dynamic menu icon colors
    'bg-gradient-to-br',
    // From/To color classes used dynamically in MENU_ICON_COLORS
    { pattern: /from-(blue|orange|pink|rose|red|cyan|teal|emerald|lime|green|violet|indigo|amber|purple|sky|yellow|fuchsia|slate|stone|gray)-(400|500|600)/ },
    { pattern: /to-(blue|orange|pink|rose|red|cyan|teal|emerald|lime|green|violet|indigo|amber|purple|sky|yellow|fuchsia|slate|stone|gray)-(400|500|600)/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        background: {
          light: '#FFFFFF',
          dark: '#0A0A0A',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          darkPrimary: '#F9FAFB',
        },
        border: {
          light: '#E5E7EB',
          dark: '#374151',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
      },
      keyframes: {
        pan: {
          '0%': { backgroundPosition: '0% 100%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pan-slow': 'pan 80s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      }
    },
  },
  plugins: [],
}

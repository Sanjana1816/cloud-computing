/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#111111',
        muted: '#6E6C66',
        line: '#E7E5DE',
        canvas: '#F5F4EF',
        surface: '#FFFFFF',
        lime: { DEFAULT: '#D4F65C', soft: '#F1FCCB', deep: '#4D6B00' },
        violet: { DEFAULT: '#7C5CFF', soft: '#EEE9FF', deep: '#4B2FD6' },
        pink: { DEFAULT: '#FF5FA2', soft: '#FFE6F1' },
        amber: { DEFAULT: '#FFC24B', soft: '#FFF4D9', deep: '#8A5A00' },
        red: { DEFAULT: '#F2554C', soft: '#FFE7E5' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(17,17,17,.04), 0 6px 20px -8px rgba(17,17,17,.10)',
        lift: '0 2px 4px rgba(17,17,17,.05), 0 16px 40px -12px rgba(17,17,17,.18)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        pop: { '0%': { transform: 'translateY(6px)', opacity: '0' }, '100%': { transform: 'none', opacity: '1' } },
        pulsering: { '0%': { transform: 'scale(.8)', opacity: '.55' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        pop: 'pop .25s ease-out',
        pulsering: 'pulsering 2s ease-out infinite',
      },
    },
  },
  plugins: [],
}

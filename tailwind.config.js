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
        ink: '#141414',
        paper: '#FFF6E9',
        cream: '#FFFDF8',
        lime: '#C6F45D',
        pink: '#FF7EC7',
        sun: '#FFD43B',
        cobalt: '#3D6BFF',
        tangerine: '#FF8A3D',
        lilac: '#BBA6FF',
        mint: '#6EE7B7',
        coral: '#FF5C5C',
      },
      boxShadow: {
        hard: '4px 4px 0 0 #141414',
        'hard-sm': '2px 2px 0 0 #141414',
        'hard-lg': '6px 6px 0 0 #141414',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        wiggle: { '0%,100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulsering: { '0%': { transform: 'scale(.7)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        wiggle: 'wiggle 2.5s ease-in-out infinite',
        bob: 'bob 4s ease-in-out infinite',
        pop: 'pop .25s ease-out',
        pulsering: 'pulsering 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}

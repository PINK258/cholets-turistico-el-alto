import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        morado: {
          50: '#faf5ff',
          100: '#f1e3ff',
          200: '#e2c7ff',
          300: '#cb9dff',
          400: '#ac68ff',
          500: '#8b3aef',
          600: '#7620d1',
          700: '#6117ab',
          800: '#4f1489',
          900: '#3a0f66',
        },
        // Acentos de inspiracion andina/boliviana (aguayo, tierra, sol) para
        // detalles decorativos, sin reemplazar el morado como color base.
        dorado: {
          400: '#f6c453',
          500: '#f0b429',
          600: '#d1930f',
        },
        terracota: {
          500: '#c1502e',
          600: '#a13f22',
        },
      },
      // Letra un poco mas grande que la de Tailwind (13 / 15 / 17 px) para que
      // se lea mejor. El hero conserva los tamaños originales (globals.css).
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],
        base: ['1.0625rem', { lineHeight: '1.7rem' }],
      },
      boxShadow: {
        card: '0 2px 10px rgba(79, 20, 137, 0.08)',
        boton: '0 4px 14px rgba(79, 20, 137, 0.25)',
        flotante: '0 18px 40px -12px rgba(97, 23, 171, 0.35)',
      },
      keyframes: {
        aparecer: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aparecer: 'aparecer 180ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;

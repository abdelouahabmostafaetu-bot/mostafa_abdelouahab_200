import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Dark mode is always on — no toggle needed
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F4F4F5',
          100: '#E7E7EA',
          200: '#D8D8DC',
          300: '#B8B8BC',
          400: '#8D8D94',
          500: '#707077',
          600: '#55555B',
          700: '#333338',
          800: '#27272B',
          900: '#202124',
        },
        accent: {
          50: '#fff0e7',
          100: '#ffd7c2',
          200: '#ffb48a',
          300: '#ff9357',
          400: '#ff7a2b',
          500: '#F36B16',
          600: '#d85c10',
          700: '#b94b0b',
          800: '#953c09',
          900: '#702e08',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '75ch',
            color: 'var(--tw-prose-body)',
            a: {
              color: '#1e3a5f',
              textDecoration: 'underline',
              fontWeight: '500',
            },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;

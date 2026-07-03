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
          50: '#f7f4ef',
          100: '#eae4da',
          200: '#d8cfc2',
          300: '#c2b4a3',
          400: '#96897a',
          500: '#7a6e60',
          600: '#5c5246',
          700: '#33291f',
          800: '#211b16',
          900: '#161311',
        },
        accent: {
          50: '#fdf6e9',
          100: '#f8e8c8',
          200: '#f0d49b',
          300: '#e7bf6f',
          400: '#e0b05a',
          500: '#d9a24a',
          600: '#c08a35',
          700: '#9e6f28',
          800: '#7c561f',
          900: '#5e4118',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
      },
      fontFamily: {
        sans: ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        heading: ['var(--font-fraunces)', 'Georgia', 'serif'],
        reading: ['var(--font-source-serif)', 'Georgia', 'serif'],
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
              color: '#d9a24a',
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

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
        // ---- Semantic tokens (resolve to CSS variables in globals.css) ----
        bg: {
          DEFAULT: 'var(--bg)',
          subtle: 'var(--bg-subtle)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          // dark ramp (replaces the old light-slate scale)
          50: '#191410',
          100: '#1d1712',
          200: '#241d16',
          300: '#2f2720',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        content: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
        },
        // ---- Primary (warm neutral) ramp ----
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
        // ---- Accent (gold) ramp — unified around #c9a45c ----
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          strong: 'var(--accent-strong)',
          muted: 'var(--accent-muted)',
          50: '#faf3e4',
          100: '#f2e3c2',
          200: '#e7cd93',
          300: '#d9b56d',
          400: '#c9a45c',
          500: '#bd9550',
          600: '#a9843f',
          700: '#8a6a32',
          800: '#6b5127',
          900: '#4d3a1c',
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
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        soft: 'var(--shadow-sm)',
      },
      maxWidth: {
        reading: 'var(--content-narrow)',
        content: 'var(--content)',
        wide: 'var(--content-wide)',
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
              color: 'var(--accent)',
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

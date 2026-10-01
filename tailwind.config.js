/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    /**
     * The width breakpoints, and nothing else. `short` used to live here as a `{ raw }` entry, and
     * it quietly cost the whole project a feature.
     */
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      /**
       * Every colour resolves through a CSS variable, so the light/dark toggle
       * is a single class swap on <html> with no re-render.
       */
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        },
        edge: 'rgb(var(--edge) / <alpha-value>)',
        /**
         * The outline of a control you are meant to *aim at* — a checkbox, a radio, a toggle's
         * track. Separate from `edge` because the two are asked to do different jobs.
         */
        check: 'rgb(var(--check-edge) / <alpha-value>)',
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          faint: 'rgb(var(--content-faint) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
          contrast: 'rgb(var(--brand-contrast) / <alpha-value>)',
        },
        positive: 'rgb(var(--positive) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      /**
       * The steps below `xs`, which Tailwind's stock scale stops at. 364 places in this codebase
       * asked for a font size in *pixels* — `text-[11px]` 176 times, `text-[10px]` 161 more.
       */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '4xs': ['0.5625rem', { lineHeight: '0.8125rem' }],
        '5xs': ['0.5rem', { lineHeight: '0.75rem' }],
      },
      /**
       * 12%, which Tailwind's stock scale does not have. The opacity modifier on a colour
       * (`bg-brand/12`) is looked up in this scale, and the stock one steps by 5.
       */
      opacity: {
        12: '0.12',
      },
      /**
       * Radii are variables too: a skin is not just a palette, and the difference between the
       * illustrated look and the terminal one is mostly how round the boxes are.
       */
      borderRadius: {
        /**
         * For rounding exactly one corner. The size tokens below feed `border-radius`, a shorthand,
         * so a skin may set an asymmetric four-value radius — and eldritch does.
         */
        corner: 'var(--radius-corner)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        postit: '0 10px 24px -12px rgb(0 0 0 / 0.5)',
        glow: '0 0 0 1px rgb(var(--brand) / 0.4), 0 12px 32px -12px rgb(var(--brand) / 0.5)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        hand: ['var(--font-hand)'],
        mono: ['var(--font-mono)'],
      },
      transitionTimingFunction: {
        studio: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 8px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // The connections belt on the landing page. Exactly half the track, because the track holds
        // the list twice.
        marquee: {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
        // The edge affordance's swell and the auth desk's floating objects are deliberately *not*
        // here — those are Framer Motion.
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        // Slow on purpose. Every card on the belt carries a sentence, and a belt that moves faster
        // than somebody can finish reading one is a belt that punishes reading.
        marquee: 'marquee 46s linear infinite',
      },
    },
  },
  plugins: [
    /**
     * A height-based variant, beside the width-based ones. Every breakpoint Tailwind ships is a
     * *width*, and vertical overflow is not a width problem.
     */
    ({ addVariant }) => {
      addVariant('short', '@media (max-height: 820px)');
    },
  ],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
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
         * The outline of a control you are meant to *aim at* — a checkbox, a
         * radio, a toggle's track.
         *
         * Separate from `edge` because the two are asked to do different jobs.
         * A panel border only has to divide two surfaces, so every skin tunes
         * `--edge` to be as quiet as it can get away with; on the default
         * studio dark that is `38 38 46` against a `23 23 28` card, a contrast
         * ratio of 1.19, which is invisible. That is correct for a divider and
         * useless for the one 20px square on a task card that the user has to
         * find before they can tick it.
         *
         * `--check-edge` defaults to `--content-faint` — the quietest colour a
         * skin still considers *legible* — and is overridden back to `--edge`
         * on the skins drawn with a heavy ink outline, where the border is
         * already the stronger of the two and also the stylistically right
         * one. See the token block in `app/styles/index.css`.
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
       * 12%, which Tailwind's stock scale does not have.
       *
       * The opacity modifier on a colour (`bg-brand/12`) is looked up in this
       * scale, and the stock one steps by 5 — so `/12` matches nothing and
       * Tailwind emits **no rule at all**. Not a fallback, not a warning: the
       * class lands in the markup, resolves to nothing, and the element paints
       * transparent.
       *
       * That had happened twenty-six times: every tinted icon chip in the app
       * (`bg-brand/12`) and the two status wells on a task card
       * (`bg-danger/12`, `bg-warning/12`) were rendering with no background,
       * which reads as a design choice rather than as a bug and so had never
       * been reported.
       *
       * Adding the step is the fix rather than rewriting all twenty-six to
       * `/15`: 12% is what the code asks for, and one scale entry cannot be
       * fat-fingered the way twenty-six edits can.
       */
      opacity: {
        12: '0.12',
      },
      /**
       * Radii are variables too: a skin is not just a palette, and the
       * difference between the illustrated look and the terminal one is mostly
       * how round the boxes are. `full` stays a literal pill on every skin.
       */
      borderRadius: {
        /**
         * For rounding exactly one corner.
         *
         * The size tokens below feed `border-radius`, a shorthand, so a skin
         * may set an asymmetric four-value radius — and eldritch does. Those
         * are invalid in a per-corner longhand (`rounded-br-2xl` and friends),
         * where the browser drops the declaration outright and the corner
         * silently stays square. This one is single-valued on every skin.
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
        /*
         * The edge affordance's swell and the auth desk's floating objects are
         * deliberately *not* here — those are Framer Motion, so they can be
         * cancelled by `useReducedMotion` at the component level rather than
         * only by the global media query.
         */
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

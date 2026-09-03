import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { SKIN_CATALOG } from '@/features/theme-toggle/model/skin-catalog';
import { SkinMock } from '@/features/theme-toggle/ui/skin-mock';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * How far off centre a name is still drawn.
 *
 * Everything past this is clipped by the barrel anyway, so computing a
 * transform for it is work nobody sees. Four rows either side of the middle is
 * comfortably more than the window shows.
 */
const VISIBLE_RADIUS = 4;

/** Where the wipe rests when nobody is pointing at it. */
const REST_SPLIT = 50;

/**
 * The thirteen skins, on a barrel, next to a comparison you drag through.
 *
 * ## Why this section exists at all
 *
 * Because the skins are the most *demonstrable* thing this product does and
 * the page was describing them in a sentence on a Post-it. "Thirteen ways to
 * look" is a claim; thirteen palettes a reader can spin through, each drawn
 * from the app's own tokens, is the thing itself. It is also the one feature
 * where a static screenshot would be actively dishonest — a picture of one skin
 * is a picture of one twelfth of the argument.
 *
 * ## Why the names are on a barrel and not in a list
 *
 * A plain list of thirteen names is a `<select>` wearing a border, and it makes
 * exactly the wrong promise: that these are options in a settings screen. The
 * barrel makes the promise the product makes — that this is a physical thing
 * you turn until you find the one you want. The rows curl away at the top and
 * bottom because they are on a cylinder, which is why the one in the middle is
 * the one you are looking at without anything having to be highlighted.
 *
 * ## Why the barrel is driven by state and not by scroll position
 *
 * The obvious build reads `scrollTop` on every frame and derives each row's
 * rotation from its distance to the centre of the viewport. That is smoother in
 * a demo and worse in every other respect: it runs main-thread work at scroll
 * frequency, it has no meaning for a keyboard user, and it makes "which theme
 * is selected" a question about pixels — so the details panel beside it either
 * flickers between two answers mid-scroll or lags behind by a frame.
 *
 * Here the *selection* is the state. Clicking a row or pressing an arrow key
 * selects it, every row's transform is a function of its distance from the
 * selected one, and the container is scrolled to bring it to the middle. The
 * panel and the preview can never disagree with the barrel, because all three
 * read the same number.
 *
 * ## Why the comparison is light against dark
 *
 * Not "before and after this theme". The obvious pairing would be the default
 * skin against the chosen one, and it collapses on the first row of the list,
 * where the chosen one *is* the default and the box shows two identical halves.
 * Light against dark is meaningful for all thirteen, and it says something true
 * that a single mock cannot: every skin here is a complete palette twice over,
 * not a dark theme with a light mode bolted on.
 */
export const ThemeShowcase = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const skin = SKIN_CATALOG[index];

  /*
   * Bring the selected name to the middle of the window.
   *
   * `scrollIntoView` on the row rather than arithmetic on the container: the
   * rows are a fixed height, so the arithmetic would be easy and would also be
   * a second copy of a measurement the browser already has. `block: 'nearest'`
   * with the container's own padding does the centring, and `behavior` follows
   * the reader's motion preference — a barrel that jumps is still a barrel.
   */
  useEffect(() => {
    const row = rowRefs.current[index];
    const list = listRef.current;
    if (!row || !list) return;

    const target = row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2;
    list.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [index, reduceMotion]);

  const move = useCallback((delta: number) => {
    setIndex((current) => {
      const next = current + delta;
      // Clamped rather than wrapped. A barrel with thirteen rows and no
      // beginning is a barrel nobody can tell they have reached the end of.
      return Math.min(SKIN_CATALOG.length - 1, Math.max(0, next));
    });
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[14rem_20rem_minmax(0,1fr)]">
      {/* ---------------------------------------------------------------
          The barrel
          --------------------------------------------------------------- */}
      <div
        /*
         * `self-center` matters more than it looks. A grid item stretches to the
         * row's height by default, and the rule marking the centre slot is
         * positioned against *this* box — so when the details column beside it
         * was taller, the rule sat eight pixels below the name it was supposed
         * to be framing. Hugging the barrel makes the two centres the same
         * centre by construction rather than by arithmetic.
         */
        className="relative self-center"
        style={{ perspective: '900px' }}
      >
        {/*
          Clipped top and bottom rather than faded to a colour.

          Same reasoning as the connections belt: this page is drawn in thirteen
          palettes and a gradient overlay only works over a known background. A
          mask removes the pixels, so the rows curl away into whatever is behind
          the section in every skin.
        */}
        <div
          ref={listRef}
          role="listbox"
          aria-label={t('landing.themes.pick')}
          aria-activedescendant={`skin-row-${skin.value}`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              move(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              move(-1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setIndex(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setIndex(SKIN_CATALOG.length - 1);
            }
          }}
          className={cn(
            /*
             * The padding is exactly half the window less half a row, so the
             * selected name sits on the centre line rather than near it:
             * (19rem - 2.5rem) / 2. Getting it wrong by eight pixels is not
             * visible on its own and is extremely visible against the rule
             * drawn at the true centre below.
             */
            'h-[19rem] overflow-y-auto overscroll-contain py-[8.25rem]',
            // The scrollbar would cut the barrel in half. The list is
            // keyboard-operable and scroll-operable either way.
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            '[mask-image:linear-gradient(180deg,transparent,black_28%,black_72%,transparent)]',
            'focus-visible:outline-none',
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {SKIN_CATALOG.map((entry, position) => {
            const offset = position - index;
            const distance = Math.abs(offset);
            const isSelected = offset === 0;

            /*
             * The curvature. Every row is a slat on a cylinder, so its angle is
             * proportional to how far round the barrel it has turned, and its
             * scale and opacity fall off with the same distance — which is what
             * makes the middle row read as nearest rather than merely as
             * highlighted. Past `VISIBLE_RADIUS` the mask has hidden it, so the
             * values stop being computed and are simply flat.
             */
            const beyond = distance > VISIBLE_RADIUS;

            return (
              <button
                key={entry.value}
                id={`skin-row-${entry.value}`}
                ref={(node) => {
                  rowRefs.current[position] = node;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => setIndex(position)}
                className={cn(
                  'block h-10 w-full origin-center text-left transition-[color,transform,opacity]',
                  'duration-300 ease-studio',
                  isSelected
                    ? 'text-xl font-bold tracking-tight text-content'
                    : 'text-sm font-medium text-content-muted hover:text-content',
                )}
                style={
                  beyond
                    ? // `visibility` rather than `opacity: 0`: a transparent
                      // button is still a button, and a row nobody can see is a
                      // row nobody should be able to click through the mask.
                      { visibility: 'hidden' }
                    : {
                        transform: `rotateX(${offset * -16}deg) scale(${1 - distance * 0.08})`,
                        opacity: 1 - distance * 0.22,
                      }
                }
              >
                {entry.name}
              </button>
            );
          })}
        </div>

        {/* Where the middle of the barrel is, drawn once rather than on the
            selected row: a rule that stays put says "this slot is the
            selection" more clearly than a highlight that moves with it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
        >
          <span className="block h-10 rounded-lg border-y border-brand/25 bg-brand/[0.05]" />
        </span>
      </div>

      {/* ---------------------------------------------------------------
          What it is
          --------------------------------------------------------------- */}
      <div className="flex flex-col justify-center gap-3">
        <p className="text-2xs uppercase tracking-[0.16em] text-content-faint">
          {t('landing.themes.count', {
            index: String(index + 1),
            total: String(SKIN_CATALOG.length),
          })}
        </p>

        {/*
          Keyed on the skin, so the block genuinely re-enters rather than
          having its text swapped underneath a static box. Thirteen names that
          cross-fade is thirteen names that read as one paragraph changing its
          mind; a short rise per selection reads as turning to the next card.
        */}
        <motion.div
          key={skin.value}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2"
        >
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{skin.name}</h3>
          <p className="text-sm font-medium text-brand">{t(skin.tagline)}</p>
          <p className="max-w-prose text-sm leading-relaxed text-content-muted">
            {t(skin.description)}
          </p>
        </motion.div>
      </div>

      {/* ---------------------------------------------------------------
          Light against dark
          --------------------------------------------------------------- */}
      <div className="lg:col-span-2 xl:col-span-1">
        <SkinCompare
          key={skin.value}
          light={skin.light}
          dark={skin.dark}
          lightLabel={t('landing.themes.light')}
          darkLabel={t('landing.themes.dark')}
          hint={t('landing.themes.hint')}
        />
      </div>
    </div>
  );
};

/**
 * Two mocks of one skin, with the seam between them under the pointer.
 *
 * ## Why the wipe is a clip and not two widths
 *
 * The obvious build gives each half a percentage width and lets them share the
 * row. It looks identical until you move the seam, at which point both mocks
 * *reflow* — the type rewraps, the cards resize, and what the reader is
 * comparing changes as they compare it. Here both mocks are full width and
 * stacked; only how much of the top one is painted changes. Nothing inside
 * either of them moves at all.
 *
 * ## Why it follows the pointer rather than being dragged
 *
 * Because there is nothing to grab on a landing page. A handle asks for a
 * gesture the reader has to notice, decide to make, and aim at; following the
 * pointer costs them nothing and is discovered by accident, which is the only
 * way anything on a page like this gets discovered. The seam eases back to the
 * middle when the pointer leaves, so the box is never left half-showing
 * something.
 *
 * On touch it responds to a drag instead — `pointermove` covers both, and the
 * container is `touch-pan-y` so a finger that meant to scroll the page still
 * scrolls the page.
 */
const SkinCompare = ({
  light,
  dark,
  lightLabel,
  darkLabel,
  hint,
}: {
  light: (typeof SKIN_CATALOG)[number]['light'];
  dark: (typeof SKIN_CATALOG)[number]['dark'];
  lightLabel: string;
  darkLabel: string;
  hint: string;
}) => {
  const [split, setSplit] = useState(REST_SPLIT);
  const [isActive, setIsActive] = useState(false);

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;

    const ratio = ((event.clientX - box.left) / box.width) * 100;
    setSplit(Math.min(100, Math.max(0, ratio)));
  };

  return (
    <figure className="space-y-2">
      <div
        onPointerMove={track}
        onPointerDown={track}
        onPointerEnter={() => setIsActive(true)}
        onPointerLeave={() => {
          setIsActive(false);
          setSplit(REST_SPLIT);
        }}
        className={cn(
          'relative touch-pan-y overflow-hidden rounded-2xl border border-edge',
          'cursor-ew-resize select-none shadow-sm',
        )}
      >
        {/* The light half, whole, underneath. */}
        <SkinMock preview={light} scale={3} className="w-full" />

        {/*
          The dark half, laid exactly on top and painted from the seam
          rightwards. `inset()` rather than a width, so the mock underneath it
          is the same size as the one above and neither ever reflows.

          The transition is only on the way *back* — a seam that eases while it
          is following the pointer lags behind it, which reads as the page being
          slow rather than as the movement being smooth.
        */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 0 0 ${split}%)`,
            transition: isActive ? undefined : 'clip-path 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <SkinMock preview={dark} scale={3} className="h-full w-full" />
        </div>

        {/* The seam itself, and the two labels that say which side is which. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-brand/80 shadow-[0_0_12px_rgb(var(--brand)/0.5)]"
          style={{
            left: `${split}%`,
            transition: isActive ? undefined : 'left 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-brand/60 bg-surface-raised text-brand">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6-4 6 4 6M15 6l4 6-4 6" />
            </svg>
          </span>
        </div>

        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-[0.12em] text-white">
          {lightLabel}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-[0.12em] text-white">
          {darkLabel}
        </span>
      </div>

      <figcaption className="text-2xs text-content-faint">{hint}</figcaption>
    </figure>
  );
};

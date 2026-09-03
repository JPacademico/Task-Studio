import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { SKIN_CATALOG } from '@/features/theme-toggle/model/skin-catalog';
import { SkinMock } from '@/features/theme-toggle/ui/skin-mock';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * How far off centre a name is still drawn.
 *
 * Everything past this is hidden by the mask anyway, so computing a transform
 * for it is work nobody sees. Four rows either side of the middle is
 * comfortably more than the window shows.
 */
const VISIBLE_RADIUS = 4;

/** Row height and window height, in px. The wheel's geometry depends on both. */
const ROW_HEIGHT = 40;
const WINDOW_HEIGHT = 320;

/** Where the wipe rests when nobody is pointing at it. */
const REST_SPLIT = 50;

/**
 * How much wheel travel advances the barrel by one name.
 *
 * A mouse wheel notch is ~100px of `deltaY`; a trackpad emits a stream of
 * single-digit deltas for the same gesture. Stepping on every event would make
 * a trackpad flick tear through all thirteen skins, and stepping only on a full
 * notch would make it feel broken. So travel accumulates and a step is spent
 * when it crosses this, which lands both devices in the same place.
 */
const WHEEL_STEP = 60;

/**
 * The skins, on a barrel, next to a comparison you drag through.
 *
 * ## Why this section exists at all
 *
 * Because the skins are the most *demonstrable* thing this product does and
 * the page was describing them in a sentence on a Post-it. "Many ways to look"
 * is a claim; a shelf of palettes a reader can spin through, each drawn from
 * the app's own tokens, is the thing itself. It is also the one feature where a
 * static screenshot would be actively dishonest — a picture of one skin is a
 * picture of a thirteenth of the argument.
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
 * ## Why the barrel is transformed rather than scrolled
 *
 * It used to be a real scroll container, and that was the bug. `overflow-y-auto`
 * means the browser owns the gesture: a wheel over the names scrolled the rows
 * out from under the centre rule while `index` — the state every transform,
 * the description panel and the preview are computed from — never changed. The
 * result was a list sliding past a highlight that stayed put and a selection
 * that never moved, which is exactly "it just goes past the options and does
 * not select anything".
 *
 * There is no scroll container now. The track is translated by
 * `index * ROW_HEIGHT`, so the selected name is on the centre line *by
 * construction*, and the wheel is read as what it always meant here — a request
 * to turn the barrel one name. Selection is the only state, so the barrel, the
 * panel and the preview cannot disagree.
 *
 * ## Why the wheel gives the page back at the ends
 *
 * Swallowing every wheel event over a control in the middle of a long page is
 * how a section becomes a trap: the reader scrolls, the page does not move, and
 * they have no idea why. So the event is only claimed while the barrel can
 * still turn in that direction. Reach the first or last name and the wheel goes
 * back to the document, which is the behaviour somebody scrolling *past* the
 * section wants and the only reason they can get out of it.
 *
 * ## Why the comparison is light against dark
 *
 * Not "before and after this theme". The obvious pairing would be the default
 * skin against the chosen one, and it collapses on the first row of the list,
 * where the chosen one *is* the default and the box shows two identical halves.
 * Light against dark is meaningful for every skin, and it says something true
 * that a single mock cannot: each one here is a complete palette twice over,
 * not a dark theme with a light mode bolted on.
 */
export const ThemeShowcase = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { skin: activeSkin, setSkin } = useTheme();

  const [index, setIndex] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const skin = SKIN_CATALOG[index];
  const isApplied = activeSkin === skin.value;

  const move = useCallback((delta: number) => {
    setIndex((current) =>
      // Clamped rather than wrapped. A barrel with no beginning is a barrel
      // nobody can tell they have reached the end of — and the clamp is also
      // what lets the wheel hand the page back, below.
      Math.min(SKIN_CATALOG.length - 1, Math.max(0, current + delta)),
    );
  }, []);

  /*
   * The wheel, bound by hand rather than through `onWheel`.
   *
   * React attaches `wheel` at the root as a *passive* listener, so
   * `preventDefault` inside a JSX `onWheel` is ignored and logs a console
   * warning. Claiming the gesture — which is the whole point here — needs a
   * non-passive listener, and the only way to ask for one is `addEventListener`
   * with the option spelled out.
   */
  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;

    let travel = 0;

    const onWheel = (event: WheelEvent) => {
      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      // At the end of the barrel in the direction being asked for, this is
      // somebody scrolling the page. Let them.
      const atEnd =
        (direction < 0 && index === 0) || (direction > 0 && index === SKIN_CATALOG.length - 1);
      if (atEnd) return;

      event.preventDefault();

      travel += event.deltaY;
      while (Math.abs(travel) >= WHEEL_STEP) {
        move(Math.sign(travel));
        travel -= Math.sign(travel) * WHEEL_STEP;
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [index, move]);

  return (
    /*
     * Wider gaps than the rest of the page uses, and deliberately.
     *
     * These three are not a row of related cards; they are three different
     * *kinds* of thing — a control, a description, and a preview — and at the
     * page's usual 2rem they read as one panel with internal dividers. The air
     * is what tells the eye where one ends.
     */
    <div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[12rem_16rem_minmax(0,1fr)] xl:gap-16">
      {/* ---------------------------------------------------------------
          The barrel
          --------------------------------------------------------------- */}
      <div
        /*
         * `self-center` matters more than it looks. A grid item stretches to the
         * row's height by default, and the rule marking the centre slot is
         * positioned against *this* box — so when the column beside it was
         * taller, the rule sat below the name it was supposed to be framing.
         * Hugging the barrel makes the two centres the same centre by
         * construction rather than by arithmetic.
         *
         * `min-w-0` is the other half, and it is not cosmetic. A grid item
         * defaults to `min-width: auto`, meaning it refuses to shrink below its
         * content's intrinsic width — and this column's content is a stack of
         * `w-full` buttons whose longest name, rotated and scaled, measured
         * 479px. On a 390px phone the column took that width, the single-column
         * grid took it with it, and the whole document scrolled sideways by
         * 105px. The wheel is `overflow-hidden`, so letting the column shrink
         * clips a long name rather than breaking the page.
         */
        className="relative min-w-0 self-center"
        style={{ perspective: '900px' }}
      >
        <div
          ref={wheelRef}
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
            'relative overflow-hidden',
            // Clipped top and bottom rather than faded to a colour. This page
            // is drawn in thirteen palettes and a gradient overlay only works
            // over a known background; a mask removes the pixels, so the rows
            // curl away into whatever is behind the section in every skin.
            '[mask-image:linear-gradient(180deg,transparent,black_26%,black_74%,transparent)]',
            'cursor-ns-resize focus-visible:outline-none',
          )}
          style={{ height: WINDOW_HEIGHT, transformStyle: 'preserve-3d' }}
        >
          {/*
            The track. Centred by translating half the window less half a row and
            then one row per name — so the selected row's centre is the window's
            centre exactly, at every index, with no measurement and nothing to
            drift out of step.
          */}
          <motion.div
            className="absolute inset-x-0 top-0"
            animate={{ y: WINDOW_HEIGHT / 2 - ROW_HEIGHT / 2 - index * ROW_HEIGHT }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 40, mass: 0.7 }
            }
            style={{ transformStyle: 'preserve-3d' }}
          >
            {SKIN_CATALOG.map((entry, position) => {
              const offset = position - index;
              const distance = Math.abs(offset);
              const isSelected = offset === 0;

              /*
               * The curvature. Every row is a slat on a cylinder, so its angle
               * is proportional to how far round the barrel it has turned, and
               * its scale and opacity fall off with the same distance — which is
               * what makes the middle row read as nearest rather than merely as
               * highlighted.
               */
              const beyond = distance > VISIBLE_RADIUS;

              return (
                <button
                  key={entry.value}
                  id={`skin-row-${entry.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => setIndex(position)}
                  className={cn(
                    'flex w-full origin-center items-center px-1 text-left',
                    'transition-[color,opacity] duration-300 ease-studio',
                    isSelected
                      ? 'text-xl font-bold tracking-tight text-content'
                      : 'text-sm font-medium text-content-muted hover:text-content',
                  )}
                  style={
                    beyond
                      ? // `visibility` rather than `opacity: 0`: a transparent
                        // button is still a button, and a row nobody can see is
                        // a row nobody should be able to click through the mask.
                        { height: ROW_HEIGHT, visibility: 'hidden' }
                      : {
                          height: ROW_HEIGHT,
                          transform: `rotateX(${offset * -16}deg) scale(${1 - distance * 0.08})`,
                          opacity: 1 - distance * 0.22,
                        }
                  }
                >
                  {entry.name}
                </button>
              );
            })}
          </motion.div>

          {/* Where the middle of the barrel is, drawn once rather than on the
              selected row: a rule that stays put says "this slot is the
              selection" more clearly than a highlight that moves with it. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
          >
            <span
              className="block rounded-lg border-y border-brand/25 bg-brand/[0.05]"
              style={{ height: ROW_HEIGHT }}
            />
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          What it is, and the button that puts it on
          --------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-col justify-center gap-4">
        <p className="text-2xs uppercase tracking-[0.16em] text-content-faint">
          {t('landing.themes.count', {
            index: String(index + 1),
            total: String(SKIN_CATALOG.length),
          })}
        </p>

        {/*
          Keyed on the skin, so the block genuinely re-enters rather than having
          its text swapped underneath a static box. Thirteen names that
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

        {/*
          ---- Wearing it ----------------------------------------------------

          The section's whole argument is that a skin reinterprets the entire
          app, and until this button existed the reader had to take that on
          trust from two 300px mocks. Pressing it repaints the page they are
          standing on — the nav, the belt, the Post-its, this panel — which is
          the claim, performed, in the only way that settles it.

          It writes through the app's own `setSkin`, not a local preview state.
          That is the difference between a toy and the real control: the choice
          is stored exactly where the settings screen stores it, so it survives
          a reload, follows the reader into sign-up, and lands on their account
          the moment they have one. A preview that evaporated on navigation
          would teach them the feature does not stick.
        */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setSkin(skin.value)}
            disabled={isApplied}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              isApplied
                ? 'cursor-default border border-positive/40 bg-positive/10 text-positive'
                : 'bg-brand text-brand-contrast shadow-sm shadow-brand/30 hover:brightness-110 active:scale-[0.98]',
            )}
          >
            {isApplied ? (
              <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
            ) : (
              <Palette aria-hidden className="h-4 w-4" />
            )}
            {t(isApplied ? 'landing.themes.applied' : 'landing.themes.apply')}
          </button>

          <p className="mt-2 max-w-xs text-2xs leading-snug text-content-faint">
            {t('landing.themes.applyHint')}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Light against dark
          --------------------------------------------------------------- */}
      <div className="min-w-0 lg:col-span-2 xl:col-span-1">
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
 *
 * ## Why the corners are barely rounded
 *
 * Because this is a *window onto an interface*, not a card in a layout. At
 * `rounded-2xl` it read as another panel on a page already full of them, and
 * the rounding fought the square corners of the mock inside it. A near-square
 * frame gets out of the way of what it is framing — and it is the shape a
 * screenshot has.
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
    <figure className="space-y-2.5">
      <div
        onPointerMove={track}
        onPointerDown={track}
        onPointerEnter={() => setIsActive(true)}
        onPointerLeave={() => {
          setIsActive(false);
          setSplit(REST_SPLIT);
        }}
        className={cn(
          'relative touch-pan-y overflow-hidden rounded-lg border border-edge',
          'cursor-ew-resize select-none shadow-md',
        )}
      >
        {/* The light half, whole, underneath. Scaled up from 3 — the box is the
            evidence in this section and it was the smallest thing in it. */}
        <SkinMock preview={light} scale={4.5} className="w-full" />

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
          <SkinMock preview={dark} scale={4.5} className="h-full w-full" />
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

        {/*
          The two labels, smaller than they were.

          They are a legend, not a heading: their whole job is to answer "which
          side am I looking at" once, and then stop being read. At the previous
          size they were the loudest thing in the box, competing with the
          palettes they exist to caption.
        */}
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/45 px-1 py-px text-4xs font-medium uppercase tracking-[0.1em] text-white">
          {lightLabel}
        </span>
        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/45 px-1 py-px text-4xs font-medium uppercase tracking-[0.1em] text-white">
          {darkLabel}
        </span>
      </div>

      <figcaption className="text-2xs text-content-faint">{hint}</figcaption>
    </figure>
  );
};

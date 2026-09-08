import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { useCanvasBudget } from '@/shared/lib/use-canvas-budget';

/**
 * The maker's mark: a `P.` in liquid metal that opens into `Pitico.`
 *
 * ## Why the letters are a picture and not text
 *
 * The shader takes an alpha mask and pours metal into it — that is the whole
 * technique, and it is why `paper-design`'s original is called *liquid logo*.
 * There is no way to hand it a DOM node. So the word is drawn onto a canvas
 * once, in the skin's own hand, and the resulting PNG is the mask.
 *
 * Drawing it rather than shipping an SVG is what keeps the mark part of the
 * theme: `--font-hand` is a marker on the Paper skin, a monospace on Terminal
 * and a carved serif on Runic, and the name in the navigation bar is already
 * set in it. A vector exported from one of those would be the one piece of
 * lettering on the page that does not change with the rest.
 *
 * ## Why the word is always fully rendered and merely clipped
 *
 * The obvious implementation of "P. becomes Pitico." is two masks and a swap.
 * It cannot be made to look right: the shader reprocesses an image whenever the
 * URL changes — an async edge-detection pass that produces a new texture — so
 * the swap lands as a flicker in the middle of the movement, which is exactly
 * where the eye is.
 *
 * Instead the mask is `Pitico` at all times, at full width, inside a box that
 * animates its own width from "as far as the P" to "all of it". The metal never
 * reloads, never re-renders and never even knows: what moves is a CSS width on
 * a `overflow: hidden` wrapper, on the compositor, for free.
 *
 * ## Why the full stop is ordinary heading text
 *
 * Because it must not move with the word. `A P. solution` and
 * `A Pitico. solution` both end the name with a stop, so a stop *inside* the
 * mask would have to travel from behind the `P` to behind the `o` — which is
 * the one part of this that a clip cannot do. Sitting outside the box as the
 * next inline character, it is always immediately after whatever is visible,
 * which is the behaviour that was wanted in the first place.
 */

const LiquidMetal = lazy(() =>
  import('@paper-design/shaders-react').then((module) => ({ default: module.LiquidMetal })),
);

/** The height the mask is rasterised at. Generous: it is a texture, not a layout. */
const MASK_HEIGHT = 180;

/**
 * Breathing room around the glyphs, as a fraction of the mask's height.
 *
 * The shader displaces the mask outward as it flows, so a letterform that runs
 * to the edge of its own texture is a letterform with a flat side. This is the
 * margin that gives the metal somewhere to move into.
 */
const MASK_PAD = 0.16;

interface Mask {
  /** The rasterised word, as a data URL. */
  url: string;
  /** The mask's own pixel dimensions, which set the aspect the box is drawn at. */
  width: number;
  height: number;
  /** How far along the mask the `P` ends — where the collapsed box is cut. */
  collapsedWidth: number;
}

/**
 * The word, rasterised in whatever hand the active skin writes in.
 *
 * Returns `null` until the fonts have actually arrived. Measuring text before
 * `document.fonts.ready` resolves gives the metrics of the *fallback* face, and
 * a mask cut to the width of Segoe UI's `P` clips a marker pen's in half — a
 * failure that only shows up on a cold load, which is every first visit.
 */
const renderMask = async (word: string, letter: string): Promise<Mask | null> => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  try {
    await document.fonts.ready;
  } catch {
    // A browser that cannot answer is a browser that draws in the fallback
    // face, which is a slightly different shape rather than a broken one.
  }

  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() ||
    'system-ui, sans-serif';

  const fontSize = MASK_HEIGHT * 0.72;
  const pad = MASK_HEIGHT * MASK_PAD;
  const font = `700 ${fontSize}px ${family}`;

  context.font = font;
  const wordWidth = context.measureText(word).width;
  const letterAdvance = context.measureText(letter).width;

  canvas.width = Math.ceil(wordWidth + pad * 2);
  canvas.height = MASK_HEIGHT;

  // Setting the size resets the context, so the font has to be declared again.
  const draw = canvas.getContext('2d');
  if (!draw) return null;

  draw.font = font;
  draw.textBaseline = 'middle';
  /*
   * White on transparent, and the colour genuinely does not matter — the shader
   * reads the alpha channel and pours its own metal into it. White is chosen
   * because it is what the mask looks like if anybody ever opens it.
   */
  draw.fillStyle = '#ffffff';
  draw.fillText(word, pad, canvas.height / 2);

  return {
    url: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    collapsedWidth: findLetterGap(draw, canvas.width, canvas.height, pad + letterAdvance * 0.55)
      ?? Math.ceil(pad + letterAdvance),
  };
};

/**
 * Where to cut the word so that exactly the first letter is showing.
 *
 * ## Why this is measured in pixels rather than computed from the metrics
 *
 * The obvious answer is `padding + measureText('P').width`, and it is wrong in
 * both directions depending on the face. An advance width is where the *next*
 * glyph is placed, not where this one's ink ends: a script `P` overhangs its own
 * advance by a couple of pixels and gets its tail sliced off, while a
 * geometric sans stops four pixels short and leaves a gap that reads as a
 * misalignment. Measured across the faces this app actually ships — a marker
 * hand, a condensed grotesque, a monospace and an old-style serif — the error
 * ran from −4px to +2px on a 90px letter, which at heading size is visible.
 *
 * ## What it does instead
 *
 * Walks right from the middle of the first letter until the ink stops, then
 * keeps walking until it starts again, and cuts down the centre of that gap.
 * That is the same judgement a person makes by eye, it is exact for any face,
 * and it costs one pass over a 400×180 buffer once per page load.
 *
 * Returns `null` where there is no gap to find — a connected script in which
 * the letters genuinely touch — and the caller falls back to the advance width,
 * which for a face like that is the only defensible answer anyway.
 */
const findLetterGap = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  from: number,
): number | null => {
  const { data } = context.getImageData(0, 0, width, height);

  const hasInk = (x: number): boolean => {
    for (let y = 0; y < height; y += 1) {
      // Anything above a hint of alpha counts. The threshold exists only to
      // ignore the antialiasing fringe, which extends a pixel or two past every
      // stroke and would close a real gap.
      if (data[(y * width + x) * 4 + 3] > 8) return true;
    }
    return false;
  };

  let x = Math.max(0, Math.round(from));
  while (x < width && hasInk(x)) x += 1;

  const gapStart = x;
  if (gapStart >= width) return null;

  while (x < width && !hasInk(x)) x += 1;

  return Math.round((gapStart + x) / 2);
};

export const PiticoMark = ({ className }: { className?: string }) => {
  const t = useT();
  const host = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const canRender = useCanvasBudget(host, '400px');

  const [mask, setMask] = useState<Mask | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const letter = t('landing.pitico.letter');
  const word = t('landing.pitico.word');

  /*
   * Rasterised once per skin, not once per render.
   *
   * The dependency is the pair of words and nothing else; a theme change swaps
   * `--font-hand` underneath and the mask is deliberately *not* redrawn for it.
   * Regenerating means a new data URL, which means the shader reprocesses the
   * image and the metal visibly restarts — a heavy, obvious event in return for
   * a change of typeface in a mark that is already abstract at this size. The
   * hand it was drawn in is whichever one was on when the section was first
   * scrolled to, which is the one the reader saw the page in.
   */
  useEffect(() => {
    let current = true;

    void renderMask(word, letter).then((result) => {
      if (current) setMask(result);
    });

    return () => {
      current = false;
    };
  }, [word, letter]);

  const isMetal = canRender && mask !== null;

  /*
   * The box, in `em`, so the mark scales with the heading it sits in.
   *
   * The aspect comes from the rasterised mask rather than from a number written
   * here, which is what keeps a wide hand (Nunito) and a narrow one (Roboto
   * Condensed) both correctly proportioned without a per-skin measurement.
   */
  const aspect = mask ? mask.width / mask.height : 3.4;
  const collapsedAspect = mask ? mask.collapsedWidth / mask.height : 1.1;

  const label = isOpen ? word : letter;

  /*
   * The clip, which only exists when there is a mask to clip.
   *
   * The collapsed width is measured off the rasterised word — it is the gap
   * between the `P` and the `i` in *that* image, at that size, in that face.
   * Applying it to the CSS fallback would be measuring one thing and cutting
   * another: the fallback is live text at a different size in a different box,
   * so the same 0.689em lands somewhere inside the second letter rather than in
   * the space before it, and the reveal opens on a sliced `i`.
   *
   * So the fallback is not clipped at all. It swaps its text between `P` and
   * `Pitico` and lets the box size to it, which produces the same reveal by the
   * only means available to it and cannot be cut in the wrong place. That
   * version does not animate — `width: auto` is not an interpolable value — and
   * it is the right trade: this path is reached by a browser with no WebGL, a
   * machine that failed the canvas budget, or a reader who asked for reduced
   * motion, and for two of those three the absence of the animation is the
   * point.
   */
  const width = useMemo(
    () => (isMetal ? `${(isOpen ? aspect : collapsedAspect).toFixed(3)}em` : undefined),
    [isMetal, isOpen, aspect, collapsedAspect],
  );

  return (
    <span
      ref={host}
      /*
       * A button, because the brief says it will lead somewhere.
       *
       * It goes nowhere yet — the company's own site does not exist — and a
       * link to nothing is worse than a control that is honestly inert: it
       * would put a destination in the status bar, offer "open in new tab", and
       * land the reader on a 404 with the product's name on it. So it is a
       * `button` with no handler, which is the shape this becomes an `<a>` from
       * the day there is an address to give it.
       *
       * `aria-label` carries the full name whatever is on screen, so the
       * sentence a screen reader reads is the expanded one — the collapsed `P.`
       * is a visual tease, and a tease is not an accessible name.
       */
      className={cn('inline-flex items-baseline align-baseline', className)}
    >
      <button
        type="button"
        aria-label={t('landing.pitico.aria')}
        title={t('landing.pitico.aria')}
        onPointerEnter={() => setIsOpen(true)}
        onPointerLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        /*
         * A tap opens it too.
         *
         * There is no hover on a touch screen, so without this the name is
         * simply unreachable on a phone — and since the click has nothing else
         * to do until the company has a site, revealing the word is a genuinely
         * useful thing to spend it on rather than a workaround.
         */
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className={cn(
          'group relative inline-block cursor-pointer overflow-hidden align-baseline',
          'rounded-sm focus-visible:outline focus-visible:outline-2',
          'focus-visible:outline-offset-4 focus-visible:outline-brand',
        )}
        style={{
          width,
          height: '1em',
          // `inline-block` with no width is as wide as its content, which for
          // the fallback is the word it is currently showing.
          display: isMetal ? undefined : 'inline-block',
          /*
           * A layout animation, deliberately, and the only one in the app.
           *
           * ## Why it is not a transform
           *
           * Because the reflow *is* the effect. `A P. solution` becoming
           * `A Pitico. solution` is a sentence growing a word in the middle of
           * itself: the full stop after the name has to move, the words after it
           * have to move, and the centred line has to re-centre around the new
           * length. `transform: scaleX` moves none of them — it stretches the
           * glyphs in place and leaves the rest of the heading where it was,
           * which is a different (and wrong) effect. Reserving the expanded
           * width and revealing with `clip-path` has the same problem from the
           * other side: the collapsed state would read `A P.      solution`,
           * with a hole where the name has not arrived yet.
           *
           * ## Why the cost is acceptable here and would not be elsewhere
           *
           * The dirty region is one line of one `h2` in a static section at the
           * foot of a marketing page. Nothing else in that section animates —
           * the shader behind it is a canvas on its own layer — and the whole
           * thing runs once, on hover, for 420ms. This is the case the
           * "animate transforms, not layout" rule is protecting *other* things
           * from; it is not a case of it.
           *
           * ## Two conditions under which it does not run
           *
           * Reduced motion gets the change with no transition rather than no
           * change at all: the reveal is information — it is how the reader
           * finds out whose product this is — and withholding it would be
           * withholding content rather than withholding an effect.
           *
           * And the fallback path is not given a transition to begin with. It
           * sizes to its text rather than to a measured width (see `width`
           * above), and `auto` is not an interpolable value — so declaring one
           * there would be a property that can never fire.
           */
          transition:
            isMetal && !reduceMotion
              ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)'
              : undefined,
        }}
      >
        {isMetal ? (
          <Suspense fallback={<MarkFallback label={label} aspect={aspect} />}>
            <span
              aria-hidden
              className="absolute left-0 top-0 block"
              style={{ width: `${aspect.toFixed(3)}em`, height: '1em' }}
            >
              <LiquidMetal
                image={mask.url}
                /*
                 * The metal itself.
                 *
                 * Warm rather than the preset's neutral chrome: the accent in
                 * this product is a cold petrol teal and a cold silver next to
                 * it reads as a second brand colour. `colorBack` is fully
                 * transparent so the mark sits in the heading rather than in a
                 * rectangle — the section behind it is doing its own work.
                 */
                colorBack="#00000000"
                colorTint="#ffffff"
                repetition={2.4}
                shiftRed={0.34}
                shiftBlue={0.28}
                contour={0.5}
                softness={0.14}
                distortion={0.09}
                angle={62}
                /* An image mask replaces the built-in silhouettes entirely. */
                shape="none"
                fit="contain"
                scale={1}
                /*
                 * Slow, and stopped for anybody who asked for that. `speed: 0`
                 * still renders — the metal is there, it simply holds still —
                 * which is the correct reduced-motion answer for something that
                 * is a *logo* rather than an animation.
                 */
                speed={reduceMotion ? 0 : 0.55}
                /*
                 * A hard ceiling on how many fragments this can ever cost. The
                 * mark is at most a few hundred pixels across; without a cap a
                 * 3× phone would render it at nine times that for no visible
                 * difference.
                 */
                maxPixelCount={480_000}
                style={{ width: '100%', height: '100%' }}
              />
            </span>
          </Suspense>
        ) : (
          <MarkFallback label={label} />
        )}
      </button>
    </span>
  );
};

/**
 * The mark without a shader.
 *
 * Reached on a machine that failed the canvas budget, on a metered connection,
 * before the mask has rasterised, and for anybody whose browser has no WebGL —
 * and it has to be a real answer rather than a gap, because this is the *name*
 * of the section it is in.
 *
 * A brushed-metal gradient clipped to the letterforms is what CSS can do here,
 * and at this size it is a surprisingly close read of the same idea: the same
 * warm highlight running diagonally across the same word, in the same hand,
 * simply not moving. `text-fill-color: transparent` is the vendor spelling that
 * every current browser still requires alongside `color: transparent`.
 */
const MarkFallback = ({ label, aspect }: { label: string; aspect?: number }) => (
  <span
    className={cn(
      'flex items-center font-hand font-bold leading-none',
      // Positioned only when it is standing in for the metal inside the clipped
      // box — see the `width` note above for why it is in flow otherwise.
      aspect === undefined ? 'whitespace-nowrap' : 'absolute left-0 top-0',
    )}
    style={{
      width: aspect === undefined ? undefined : `${aspect.toFixed(3)}em`,
      height: '1em',
      fontSize: '0.86em',
      backgroundImage:
        'linear-gradient(104deg, #9aa3ad 0%, #f4f6f8 18%, #b9c2cc 38%, #ffffff 52%, #98a2ad 72%, #e8ecf0 88%, #a8b2bd 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    }}
  >
    {label}
  </span>
);

export default PiticoMark;

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

interface GlyphProps {
  className?: string;
}

/**
 * The drawings the Dragon skin is made of.
 *
 * Three objects, and they are deliberately the only three: a mark, a dragon and
 * a scroll rod. Everything else the skin does — the lacquer, the gold mounting
 * rules, the brush face — is CSS, because it is a *material* rather than a
 * thing, and materials belong in the stylesheet where every panel picks them up
 * without a component wrapping it.
 */

/**
 * The product mark, cut from jade.
 *
 * ## Why a pendant and not a disc
 *
 * The obvious imperial jade object is the *bi* — the flat ring — and it is the
 * wrong one here, because the mark has a job: every skin's mark is the same
 * object rebuilt in that world's material, and that object is a sheet with the
 * product's initial on it. A ring has no field to carve a letter into, so it
 * would have been a jade ornament that happens to sit where the logo goes.
 *
 * A carved plaque keeps the rule. It is a sheet — squared, bevelled, drilled at
 * the top for its cord — and the `t` is incised into it rather than printed on
 * it, which is what jade does to a letter: the stroke is a groove that catches
 * the light on one side and holds shadow on the other.
 *
 * ## Why it is jade on both palettes and not `currentColor`
 *
 * Every other mark takes the accent, and this one cannot. The skin's accent
 * moves between palettes — cinnabar on the light scroll, gold in the dark hall
 * — and a mark that changed stone with the lights would not be a mark. Jade is
 * the one constant in an imperial room: it is a stone rather than a light, and
 * `--dragon-jade` is declared in both palettes at the value the stone actually
 * is under each. The drilled eye takes the accent, which is the one part that
 * *is* allowed to be gold in one room and red in the other.
 */
export const JadeMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      {/*
        The stone, lit from the upper left.
        Jade is translucent, so the gradient runs from a bright, almost white-
        green at the lit corner to a deep saturated green in the shadow — a
        flat fill reads as painted plastic at any size.
      */}
      <linearGradient id="ts-jade-stone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--dragon-jade-lit))" />
        <stop offset="48%" stopColor="rgb(var(--dragon-jade))" />
        <stop offset="100%" stopColor="rgb(var(--dragon-jade-deep))" />
      </linearGradient>
    </defs>

    {/*
      The plaque.

      ## Why there is no cord above it any more

      There was: two short `currentColor` strokes arching out of the drilled
      eye, the silk the pendant hangs from. It was cinnabar on the light
      palette, which put a small red hook on top of the mark at every size the
      mark is drawn — 16px in a browser tab, 32px in the rail, 44px on the
      landing page — and at the two smaller ones it stopped reading as a cord
      and started reading as a stray mark above the logo.

      The drilled eye stays, and it is the part that was doing the work. A hole
      bored through the top of a plaque says *this hangs from something*
      without having to draw the something; that is how the object is
      identified on a real pendant seen flat. What is gone is the attempt to
      also draw the something, at a size where it could only ever be four
      pixels of red.
    */}
    <rect x="7" y="5.6" width="26" height="29" rx="4.2" fill="url(#ts-jade-stone)" />

    {/* The bevel: an inset rule the whole way round, which is what makes the
        edge read as a cut face rather than as a border drawn on a rectangle. */}
    <rect
      x="9.6"
      y="8.2"
      width="20.8"
      height="23.8"
      rx="2.6"
      stroke="rgb(var(--dragon-jade-lit))"
      strokeOpacity="0.55"
      strokeWidth="1"
    />

    {/* The drilled eye — the hole a cord would pass through, which is the whole
        of what says this is a pendant. See the note on the plaque. */}
    <circle cx="20" cy="9.6" r="1.5" fill="rgb(var(--dragon-jade-deep))" />
    <circle cx="20" cy="9.6" r="1.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.7" />

    {/*
      The letter, incised.

      Two strokes of the same path: a dark one offset down-right for the
      shadowed wall of the groove, and a light one at rest for the lit wall.
      That pair is the entire illusion of depth — carving a letter into jade
      with a single stroke gives a letter *on* jade.
    */}
    <g strokeLinecap="round" fill="none">
      <path
        d="M20.6 14.6v10.1c0 1.6.9 2.4 2.5 2.4M16.4 18.4h7.6"
        stroke="rgb(var(--dragon-jade-deep))"
        strokeWidth="2.6"
        transform="translate(0.55 0.55)"
      />
      <path
        d="M20.6 14.6v10.1c0 1.6.9 2.4 2.5 2.4M16.4 18.4h7.6"
        stroke="rgb(var(--dragon-jade-lit))"
        strokeOpacity="0.92"
        strokeWidth="2.2"
      />
    </g>
  </svg>
);

/* -------------------------------------------------------------------------- *
 * The dragon
 * -------------------------------------------------------------------------- */

/**
 * How many pieces the body is built from, and how far apart they sit.
 *
 * Twenty-six at 8.7 units is a body about 220 units long against a segment that
 * is at most 23 wide — so consecutive scales overlap by roughly two thirds and
 * the join between them reads as a scale rather than as a seam. Fewer segments
 * and the animal is a caterpillar; more and each one's own animation is buying
 * a difference nobody can see.
 */
const SEGMENTS = 26;
const SEGMENT_STEP = 8.7;

/** Where the head sits in the viewBox, and the line the body rests on. */
const HEAD_X = 268;
const SPINE_Y = 74;

/**
 * The wave: one period, and how far behind its neighbour each segment runs.
 *
 * `SEGMENT_LAG * SEGMENTS` is about three quarters of `WAVE_SECONDS`, which is
 * the number that actually matters — it is how much of a sine wave is visible
 * along the animal at any moment. At a full period the body would hold a
 * complete S and read as a fixed shape wobbling; at a tenth of one every
 * segment moves together and the whole dragon bobs like a plank. Three
 * quarters is one long undulation travelling from the head to the tail, which
 * is the motion this is for.
 *
 * Both are handed to the stylesheet as custom properties on the root of the
 * drawing rather than written down twice. Every other timing in this skin is
 * duplicated between a component and `index.css` — the crossing's eleven
 * seconds, the watcher's lifetime — and that is right for a number the CSS has
 * to place keyframe stops against. These two are only ever *read* by the
 * animation, never used to position anything, so the variable carries them and
 * there is nothing to keep in step.
 */
const WAVE_SECONDS = 2.2;
const SEGMENT_LAG = 0.062;

/**
 * How thick the body is at each segment, head first.
 *
 * Two regimes, because a dragon is not a cone. The first five swell from the
 * neck out to the shoulder — that is what makes the head read as a head rather
 * than as the wide end of a tube — and everything past it falls away to a whip.
 * The exponent is what makes the fall-off a taper rather than a straight line:
 * at 1.0 the tail is a wedge, and at 0.5 the body holds its mass through the
 * middle and loses it quickly at the very end, which is how the animal is drawn
 * everywhere it is drawn.
 */
const radius = (index: number): number => {
  if (index <= 4) return 8 + index * 0.95;

  const t = (index - 4) / (SEGMENTS - 5);
  return Math.max(2.2, 11.6 * (1 - t) ** 0.5);
};

/**
 * How far that segment travels, and how much it leans doing it.
 *
 * Both grow towards the tail. A wave of constant amplitude is a rope being
 * shaken; the tail of a swimming animal always moves further than its
 * shoulders, because there is less of it and nothing behind it to resist.
 */
const amplitude = (index: number): number => 12 + (index / (SEGMENTS - 1)) * 13;
const lean = (index: number): number => 5 + (index / (SEGMENTS - 1)) * 8;

/**
 * The two custom properties every animated piece carries.
 *
 * The phase is `--i`; `.dragon-seg` in `index.css` multiplies it by the lag and
 * subtracts a large constant, which is what starts every segment part-way
 * through its own cycle rather than all of them at zero. The subtraction is
 * what matters: a positive delay is a *pause*, so the first crossing would
 * begin with a perfectly straight dragon sitting still for a beat.
 */
const rig = (index: number, leanBonus = 0): CSSProperties =>
  ({
    '--i': index,
    '--amp': amplitude(index).toFixed(2),
    '--tilt': (lean(index) + leanBonus).toFixed(2),
  }) as CSSProperties;

/** One segment's pair of nested groups: the rise and fall, then the lean. */
const Segment = ({
  index,
  dx = 0,
  leanBonus = 0,
  children,
}: {
  index: number;
  dx?: number;
  leanBonus?: number;
  children: ReactNode;
}) => (
  <g transform={`translate(${(HEAD_X - index * SEGMENT_STEP + dx).toFixed(2)} ${SPINE_Y})`}>
    {/*
      Two elements, and they have to be two.

      The rise and fall is a `translateY` and the lean is a `rotate`, and they
      run a quarter of a period apart — the lean is at its steepest where the
      travel is fastest, which is what a body following a wave actually does.
      Written on one element the second animation would simply overwrite the
      first, because a `transform` is one property however many functions are
      in it. `.dragon-seg__tilt` carries the quarter-period offset; see the
      stylesheet.
    */}
    <g className="dragon-seg" style={rig(index)}>
      <g className="dragon-seg__tilt" style={rig(index, leanBonus)}>
        {children}
      </g>
    </g>
  </g>
);

/** Indices counted from the head, so `map` runs head-first and paints tail-first. */
const bodyOrder = Array.from({ length: SEGMENTS }, (_, index) => SEGMENTS - 1 - index);

/**
 * The dragon itself: the thing that crosses the page once a minute.
 *
 * ## Why it is a rig rather than a drawing
 *
 * The previous version was one filled outline generated from a centreline, and
 * it could not move. What it had instead was a `translateY`/`rotate` cycle on
 * the whole glyph — the entire animal rising and falling as one rigid body,
 * which is a plank on a swell rather than anything alive. Nothing that flies or
 * swims moves that way, and it is the single loudest thing wrong with a
 * serpent: a serpent is *defined* by the wave passing along it.
 *
 * So the body is twenty-six overlapping pieces, each carrying the same
 * animation on its own delay. The head leads, every piece behind it repeats
 * what the piece in front did a fraction of a second earlier, and the result is
 * one undulation travelling from the head to the tip of the tail — the motion
 * of every snake game ever written, which is exactly the reference.
 *
 * ## Why this is cheaper than it looks
 *
 * Every moving part animates `transform` and nothing else, so the whole animal
 * is handed to the compositor once and costs the main thread nothing per frame
 * — no layout, no paint, no style recalculation. That is the same budget the
 * eldritch rails already spend on twenty-one jointed limbs at all times, and
 * this one exists for eleven seconds a minute on one skin.
 *
 * It is also why this is not a GIF. A GIF of this animal at a size that does
 * not dissolve on a 4K panel is a few hundred kilobytes of fixed-palette frames
 * with one-bit transparency, locked to one size, one frame rate and one colour
 * scheme — and this skin has two palettes. What is here instead is a few
 * kilobytes of markup that is resolution-independent, themed by the same
 * variables as everything else, pausable, and free to the main thread.
 *
 * ## Why it is in colour now
 *
 * Because the old one could not afford to be. A single-colour silhouette at 8%
 * opacity was the right answer for a shape with no internal structure — every
 * detail that survived was outline, and a second colour would have been two
 * indistinguishable greys. This one is built from parts that are genuinely
 * different materials: gold scale, jade crest and mane, cinnabar claws and
 * mouth. Drawn flat they would be a mess; drawn as themselves they are the
 * animal off a lacquer screen, which is what the skin is.
 *
 * The opacity it is composited at is `.dragon-flight__body`'s problem, not
 * this component's — see the note there for what changed and why.
 */
export const DragonGlyph = ({ className }: GlyphProps) => (
  <svg
    viewBox="0 0 300 148"
    fill="none"
    aria-hidden
    className={cn('h-16 w-auto', className)}
    style={
      {
        '--wave-dur': `${WAVE_SECONDS}s`,
        '--wave-lag': `${SEGMENT_LAG}s`,
      } as CSSProperties
    }
  >
    {/*
      Six passes, and the order is the whole of the depth in this drawing.

      Each pass walks the body separately so that *every* crest spine is behind
      *every* scale, rather than each segment's own spine being behind its own
      scale and in front of its neighbour's. Interleaving them — one segment
      drawn complete, then the next — is what gives a scalloped body a row of
      fins that appear to be threaded through it.
    */}

    {/* 1. The dorsal crest, behind everything. */}
    {bodyOrder
      .filter((index) => index >= 1 && index <= SEGMENTS - 2)
      .map((index) => {
        const r = radius(index);
        // Uneven heights from the index rather than from `Math.random`: a ridge
        // of identical triangles is a stegosaurus, and a ridge that is a
        // different shape on every render is a flicker.
        const spine = (r * 0.95 + 3) * (0.82 + ((index * 7) % 5) * 0.09);

        return (
          <Segment key={`crest-${index}`} index={index}>
            <path
              d={`M-5.4 ${(-r + 2).toFixed(1)} C -3.4 ${(-r - spine).toFixed(1)}, 0.6 ${(
                -r -
                spine * 1.1
              ).toFixed(1)}, 4.6 ${(-r + 1).toFixed(1)} Z`}
              fill="rgb(var(--dragon-jade))"
            />
          </Segment>
        );
      })}

    {/* 2. The far pair of legs: the same limb, dimmer and a little behind. The
           cheapest depth cue there is, and the only one that survives at this
           size. */}
    {[6, 16].map((index) => (
      <Segment key={`far-leg-${index}`} index={index} dx={-3}>
        <path
          d="M-3 4 C -7 11, -5 18, 1 22 L 6 18 C 2 15, 1 11, 3 5 Z"
          fill="rgb(var(--dragon-scale-deep))"
          opacity="0.5"
        />
      </Segment>
    ))}

    {/* 3. The body. */}
    {bodyOrder.map((index) => {
      const r = radius(index);

      return (
        <Segment key={`body-${index}`} index={index}>
          {/* Wider than it is tall, which is what turns a stack of circles into
              a body: at this ratio the visible part of each scale is a shallow
              arc rather than a disc. */}
          <ellipse
            cx="0"
            cy="0"
            rx={(r * 1.5).toFixed(2)}
            ry={r.toFixed(2)}
            fill="rgb(var(--dragon-scale))"
            stroke="rgb(var(--dragon-ink))"
            strokeOpacity="0.17"
            strokeWidth="1"
          />
          {r > 3 && (
            <ellipse
              cx="0"
              cy={(r * 0.42).toFixed(2)}
              rx={(r * 1.08).toFixed(2)}
              ry={(r * 0.46).toFixed(2)}
              fill="rgb(var(--dragon-scale-lit))"
              fillOpacity="0.5"
            />
          )}
          {r > 5 && (
            <path
              d={`M${(-r * 0.9).toFixed(1)} ${(-r * 0.32).toFixed(1)} q ${(r * 0.9).toFixed(
                1,
              )} ${(r * 0.5).toFixed(1)} ${(r * 1.8).toFixed(1)} 0`}
              stroke="rgb(var(--dragon-scale-deep))"
              strokeOpacity="0.45"
              strokeWidth="1"
              fill="none"
            />
          )}
        </Segment>
      );
    })}

    {/* 4. The tail fin — a spray of three blades, which is where a Chinese
           dragon ends rather than in a point. Carried by the last segment, so
           it whips with it instead of trailing behind. */}
    <Segment index={SEGMENTS - 1} dx={-4} leanBonus={6}>
      <path
        d="M6 0 C 0 -2, -7 -8, -13 -17 C -5 -14, -1 -11, 2 -8 C -1 -15, -3 -22, -2 -30 C 3 -22, 5 -15, 6 -8 C 9 -14, 14 -19, 20 -22 C 17 -13, 12 -5, 7 1 Z"
        fill="rgb(var(--dragon-jade))"
        stroke="rgb(var(--dragon-ink))"
        strokeOpacity="0.34"
        strokeWidth="1"
      />
    </Segment>

    {/* 5. The near pair of legs, over the body. */}
    {[5, 15].map((index) => (
      <Segment key={`leg-${index}`} index={index} dx={2}>
        {/* The jade tuft at the shoulder — the flame every drawing of this
            animal puts where a limb leaves the body. */}
        <path d="M-8 4 C -13 10, -15 16, -14 22 C -10 16, -7 12, -3 9 Z" fill="rgb(var(--dragon-jade))" />
        <path
          d="M-4 2 C -8 11, -6 20, 1 26 L 7 21 C 2 17, 1 12, 4 4 Z"
          fill="rgb(var(--dragon-scale))"
          stroke="rgb(var(--dragon-ink))"
          strokeOpacity="0.34"
          strokeWidth="1"
        />
        <path
          d="M1 26 C -3 29, -6 32, -8 36 M3.4 27 C 2.6 31, 2 34, 2 38 M6 25.6 C 8.6 29, 10.6 32, 12 35"
          stroke="rgb(var(--dragon-cinnabar))"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </Segment>
    ))}

    {/* 6. The head, which is segment zero and therefore leads the wave. */}
    <Segment index={0} leanBonus={3}>
      {/* The barbels, trailing back over the neck. Drawn first so the skull
          sits on top of where they leave the snout. */}
      <g
        stroke="rgb(var(--dragon-jade-lit))"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M25 -4 C 17 -10, 2 -13, -16 -10 C -28 -8, -36 -11, -43 -16" />
        <path d="M23 4 C 17 11, 2 16, -16 14 C -28 13, -36 16, -43 22" />
      </g>

      {/* The mane: jade flames off the back of the skull, behind it only. */}
      <path
        d="M-12 -9 C -19 -15, -25 -13, -31 -18 C -26 -8, -23 -3, -18 0 C -25 1, -30 6, -34 15 C -26 10, -18 8, -12 9 Z"
        fill="rgb(var(--dragon-jade))"
      />

      {/* The beard, under the hinge. */}
      <path d="M-9 6 C -11 15, -16 22, -24 25 C -18 17, -15 12, -15 6 Z" fill="rgb(var(--dragon-jade))" />

      {/* Antlers. Stroked rather than filled: three tapering branches read as a
          rack at thirty pixels, where three closed outlines read as a blob. */}
      <g
        stroke="rgb(var(--dragon-scale-deep))"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M-5 -14 C -10 -22, -16 -28, -25 -33" />
        <path d="M-13 -24 C -16 -29, -21 -33, -27 -35" />
        <path d="M-9 -19 C -10 -26, -8 -32, -4 -36" />
      </g>

      {/*
        The open mouth.

        The whole wedge between the two jaws, filled before either of them is
        drawn. Drawing the *gap* instead — a sliver following the lower jaw's
        own top edge — is what made the first pass read as a closed mouth with a
        red line on it: there was nothing behind the teeth.
      */}
      <path d="M-8 0 L 26 1 L 21 15 C 8 12, -2 8, -9 5 Z" fill="rgb(var(--dragon-cinnabar))" />
      <path
        d="M-6 3 C 2 6, 10 9, 16 12 C 10 14, 0 11, -7 8 Z"
        fill="rgb(var(--dragon-cinnabar))"
        opacity="0.55"
      />

      {/* Upper skull and snout. Blunt rather than tapered, with the nose turned
          up as part of the same outline: a Chinese dragon's muzzle ends in a
          squared nose, and a point is what makes the same drawing read as a
          lizard. A separate blob on the end reads as a ball. */}
      <path
        d="M-14 -7 C -13 -17, -3 -22, 6 -18 C 11 -16, 14 -12, 18 -10 C 22 -9, 27 -10, 28 -5 C 29 -1, 26 1, 23 1 L 5 1 C -7 1, -13 -2, -14 -7 Z"
        fill="rgb(var(--dragon-scale))"
        stroke="rgb(var(--dragon-ink))"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <path
        d="M-7 -14 C -1 -18, 6 -17, 10 -13"
        stroke="rgb(var(--dragon-scale-deep))"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Upper teeth, hanging off the lip line. */}
      <path d="M8 1 l 2.6 4.6 l 2.2 -4.4 Z M16 1.4 l 2.4 4.2 l 2.2 -4 Z" fill="rgb(253 250 242)" />

      {/* Lower jaw, dropped away under the snout. */}
      <path
        d="M-12 4 C -3 8, 8 11, 18 14 C 22 15.4, 22 18.4, 18 18 C 7 16.8, -4 13, -12 9.6 Z"
        fill="rgb(var(--dragon-scale))"
        stroke="rgb(var(--dragon-ink))"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <path d="M9 11.4 l 1.6 -4.4 l 2.6 3.6 Z" fill="rgb(253 250 242)" />

      {/* The eye, and the nostril on top of the nose. */}
      <circle
        cx="-2"
        cy="-10"
        r="4.2"
        fill="rgb(253 248 236)"
        stroke="rgb(var(--dragon-ink))"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <circle cx="-1" cy="-10" r="2" fill="rgb(var(--dragon-ink))" />
      <circle cx="24" cy="-6" r="1.5" fill="rgb(var(--dragon-ink))" opacity="0.6" />
    </Segment>
  </svg>
);

/**
 * The turned rod a hanging scroll is wound on, stood on its end.
 *
 * This replaces the glow that every other skin uses to say "there is a menu
 * just off this edge". The argument for the swap is that the glow is an
 * abstraction — a soft light meaning *something is over here* — and this skin
 * has a literal object that means exactly that and nothing else: a scroll is
 * opened by its handle, the handle sits at the edge of the sheet, and a reader
 * who has ever seen one knows what to do with it without being told.
 *
 * ## Why it is drawn at the size of the thing it replaces
 *
 * Same length along the edge, same reach across it. The affordance was tuned so
 * that it registers in peripheral vision and stops short of anything being
 * read, and none of that reasoning is about what the shape *is* — so the shape
 * changed and the measurements did not.
 *
 * `edge` flips the finials and the lighting, so the rod on the right is lit
 * from the right and its knobs point outward. Drawn for the left and mirrored
 * with a transform would put the highlight on the wrong side, which is the one
 * thing that would make it read as a sticker.
 */
export const ScrollHandle = ({
  edge,
  className,
}: GlyphProps & { edge: 'left' | 'right' }) => {
  /*
   * The rod hugs the screen edge and the sheet unrolls towards the page.
   *
   * Which means the whole drawing shifts across the viewBox depending on which
   * side it is on — it is not a mirror. The first version *was* one layout with
   * the gradient reversed for the right-hand rod, and it put the silk
   * underneath the rod on that side, where it could not be seen at all.
   */
  const rodX = edge === 'left' ? 3 : 10;
  const centre = rodX + 5.5;
  const silkX = edge === 'left' ? 18 : 0;

  return (
    <svg
      viewBox="0 0 24 168"
      fill="none"
      aria-hidden
      preserveAspectRatio="none"
      className={cn('h-full w-full', className)}
    >
      <defs>
        {/*
          The lacquered rod: a cylinder is a gradient across its width and
          nothing else — a dark limb, a hot specular line about a third in, and
          a warmer reflected bounce on the far side. Three stops read as turned
          wood; two read as a bar.

          The same direction on both rods, deliberately. Mirroring it for the
          right-hand one would light the two from opposite sides, and every
          other raised surface in this interface is lit from the upper left
          (see `--shadow-panel`). A rod lit from the right would be the only
          object on the page disagreeing about where the lamp is.
        */}
        <linearGradient id="ts-scroll-rod" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--dragon-rod-deep))" />
          <stop offset="34%" stopColor="rgb(var(--dragon-rod-lit))" />
          <stop offset="62%" stopColor="rgb(var(--dragon-rod))" />
          <stop offset="100%" stopColor="rgb(var(--dragon-rod-deep))" />
        </linearGradient>
      </defs>

      {/* The silk edge of the scroll, still wound on the rod. It is what makes
          this a *handle* rather than a dowel lying against the screen. */}
      <rect x={silkX} y="14" width="6" height="140" fill="currentColor" fillOpacity="0.16" />

      {/* The rod. */}
      <rect x={rodX} y="10" width="11" height="148" rx="5.5" fill="url(#ts-scroll-rod)" />

      {/* The two turned finials — the knobs at each end a hand takes hold of.
          Wider than the rod, which is the whole reason they read as ends rather
          than as decoration on a continuous bar. */}
      <g fill="url(#ts-scroll-rod)">
        <ellipse cx={centre} cy="10" rx="7.5" ry="6.5" />
        <ellipse cx={centre} cy="158" rx="7.5" ry="6.5" />
      </g>

      {/* Gold ferrules on the finials: the metal cap on a mounted scroll, and
          the one part of this that carries the room's accent. */}
      <g fill="currentColor" fillOpacity="0.9">
        <ellipse cx={centre} cy="10" rx="7.5" ry="2.4" />
        <ellipse cx={centre} cy="158" rx="7.5" ry="2.4" />
      </g>

      {/* Two incised rings near each end, where the rod is turned down to take
          the ferrule. Hairlines, but at this scale they are the difference
          between turned wood and an extruded shape. */}
      <g stroke="rgb(var(--dragon-rod-deep))" strokeWidth="1.4" strokeOpacity="0.85">
        <path d={`M${rodX + 0.4} 21h10.2M${rodX + 0.4} 26h10.2`} />
        <path d={`M${rodX + 0.4} 142h10.2M${rodX + 0.4} 147h10.2`} />
      </g>
    </svg>
  );
};

/**
 * A hanging paper lantern — 灯笼.
 *
 * ## Why this is the fourth object and not a fifth piece of CSS
 *
 * The rule at the top of this file is that materials belong in the stylesheet
 * and *things* belong here, and a lantern is unambiguously a thing: it has a
 * cap, a body, ribs, a skirt and a tassel, and the relationship between those
 * five parts is what makes it read as a lantern rather than as a red oval. No
 * arrangement of gradients on a `<span>` gets there.
 *
 * ## Why it is drawn from the top down
 *
 * Because that is the order the object is assembled in, and every part below
 * hangs off the one above it. The cord is what it hangs *from* — one hairline,
 * because at the 28px this is drawn at, a thicker one reads as a stem and turns
 * the whole thing into a cherry.
 *
 * ## The body, and the one decision that makes it look lit
 *
 * A real lantern is paper stretched over a frame with a flame inside, so it is
 * brightest in the middle and darkest where the paper turns away at the edges.
 * The radial gradient is off-centre — up and to the left — which puts the hot
 * spot where a light hanging slightly above and in front of the viewer would
 * put it, and the deep lacquer at 100% is the paper seen nearly edge-on.
 *
 * A flat vermilion fill was the first attempt and it reads as a balloon. The
 * difference is entirely in that gradient; nothing else about the shape
 * changed.
 *
 * ## The ribs
 *
 * Three, not six. They are the bamboo the paper is stretched over, seen
 * through it, so they are drawn as arcs rather than straight lines — a rib on
 * a bulging body is a curve in projection — and at low opacity, because what
 * is being seen is a shadow *inside* a lit paper shell rather than a line on
 * its surface. Six would be accurate and would also turn the body into a
 * hatching pattern at this size.
 *
 * The two outermost are shorter and closer to the silhouette than even spacing
 * would put them, which is what foreshortening does to a cylinder and is the
 * cheapest available cue that the thing is round rather than flat.
 *
 * ## The tassel
 *
 * Three strands of unequal length, splayed. Equal lengths read as a fringe
 * printed on the bottom cap; unequal ones read as silk that has been hanging
 * there. It is also the part that sells the *motion* in `LanternDrift` — the
 * body barely deforms as the lantern sways, and the tassel is what trails.
 */
export const LanternGlyph = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 28 44" fill="none" aria-hidden className={cn('h-11 w-7', className)}>
    <defs>
      {/*
        The paper, lit from inside and slightly above.

        `fr` is not used — a plain two-stop radial with the focus moved is
        enough, and `fr` is the one radial-gradient attribute Safari was late
        to and still renders differently.
      */}
      <radialGradient id="ts-lantern-paper" cx="38%" cy="34%" r="72%">
        <stop offset="0%" stopColor="rgb(var(--dragon-scale-lit))" stopOpacity="0.95" />
        <stop offset="34%" stopColor="rgb(var(--dragon-vermilion))" />
        <stop offset="100%" stopColor="rgb(var(--dragon-lacquer))" />
      </radialGradient>

      {/* The turned wooden caps, which are the same rod the scrolls are wound
          on — this skin owns exactly one piece of lacquered wood. */}
      <linearGradient id="ts-lantern-cap" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgb(var(--dragon-scale-deep))" />
        <stop offset="46%" stopColor="rgb(var(--dragon-scale-lit))" />
        <stop offset="100%" stopColor="rgb(var(--dragon-scale-deep))" />
      </linearGradient>
    </defs>

    {/* The cord it hangs from, and the ring it hangs by. */}
    <path
      d="M14 0.5v4"
      stroke="rgb(var(--dragon-scale))"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
    <circle cx="14" cy="5.6" r="1.9" stroke="rgb(var(--dragon-scale))" strokeWidth="1.1" />

    {/* Top cap. */}
    <rect x="8.2" y="7.4" width="11.6" height="3.4" rx="1.4" fill="url(#ts-lantern-cap)" />

    {/* The body. */}
    <ellipse cx="14" cy="22.5" rx="11.2" ry="10.6" fill="url(#ts-lantern-paper)" />

    {/* The ribs, seen through the paper. */}
    <g stroke="rgb(var(--dragon-ink))" strokeOpacity="0.2" strokeWidth="0.9" fill="none">
      <path d="M14 11.9v21.2" />
      <path d="M8.4 12.9c-1.6 3-1.6 16.2 0 19.2" />
      <path d="M19.6 12.9c1.6 3 1.6 16.2 0 19.2" />
    </g>

    {/*
      The brocade band, which is the one place the object carries writing.

      Left blank on purpose. A real lantern has a character on it, and putting
      one here would make this a picture of a *specific* lantern saying a
      specific word — in a product whose interface is English and Portuguese,
      and in a skin whose whole argument is that it borrows a material rather
      than a language. The band is the gesture; the reader supplies the rest.
    */}
    <path
      d="M3.4 20.6h21.2M3.4 24.4h21.2"
      stroke="rgb(var(--dragon-scale))"
      strokeOpacity="0.55"
      strokeWidth="1"
    />

    {/* Bottom cap. */}
    <rect x="8.2" y="32.1" width="11.6" height="3.4" rx="1.4" fill="url(#ts-lantern-cap)" />

    {/* The tassel. */}
    <g stroke="rgb(var(--dragon-scale))" strokeWidth="1.2" strokeLinecap="round">
      <path d="M11.4 35.8 10.6 41.4" strokeOpacity="0.85" />
      <path d="M14 35.8 14 43.4" />
      <path d="M16.6 35.8 17.4 40.6" strokeOpacity="0.85" />
    </g>
  </svg>
);

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
 * is under each. The cord and the drilled eye take the accent, which is the
 * part that *is* allowed to be gold in one room and red in the other.
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

    {/* The silk cord through the drilled eye, in the room's own metal. */}
    <path
      d="M20 2.6c-2.6 0-4 1.5-4 3.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.85"
    />
    <path
      d="M20 2.6c2.6 0 4 1.5 4 3.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* The plaque. */}
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

    {/* The drilled eye the cord passes through. */}
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

/**
 * The dragon itself: the thing that crosses the page once a minute.
 *
 * ## Why the body is one filled outline and not a stroked line
 *
 * A Chinese dragon tapers — thick through the shoulders, thin to a whip at the
 * tail — and SVG has no tapering stroke. A constant-width path reads as a hose.
 * So the silhouette is a closed outline generated from a centreline and a width
 * function: the centreline gives it two and a bit undulations so it is
 * serpentine rather than merely curved, and the width swells at the shoulder
 * and narrows again into the neck, which is what makes the head read as a head
 * rather than as the end of the tube.
 *
 * The coordinates are sampled rather than hand-drawn, which is why there are so
 * many of them. They are not meant to be edited by hand — the generator is
 * eight lines of trigonometry and lives in the commit that added this file.
 *
 * ## Why it is one colour
 *
 * It passes behind the entire interface at low opacity. Every detail that
 * survives that is silhouette: the undulation, the crest, the horns, the
 * whiskers, the four legs. A second colour would be two indistinguishable
 * greys in practice and a second paint the compositor has to do for real.
 */
export const DragonGlyph = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 264 68" fill="none" aria-hidden className={cn('h-16 w-auto', className)}>
    <g fill="currentColor">
      {/* The body, tail at the left, neck at the right. */}
      <path d="M 7.9 37.4 L 10.3 38.1 L 12.8 38.6 L 15.3 39.2 L 17.8 39.7 L 20.2 40.2 L 22.7 40.7 L 25.2 41.2 L 27.7 41.6 L 30.2 42.0 L 32.7 42.3 L 35.2 42.6 L 37.7 42.9 L 40.2 43.2 L 42.8 43.4 L 45.3 43.6 L 47.8 43.7 L 50.3 43.8 L 52.9 43.8 L 55.4 43.8 L 58.0 43.7 L 60.5 43.7 L 63.1 43.5 L 65.6 43.3 L 68.2 43.1 L 70.7 42.8 L 73.3 42.5 L 75.8 42.2 L 78.4 41.8 L 80.9 41.3 L 83.5 40.9 L 86.0 40.4 L 88.6 39.9 L 91.1 39.4 L 93.6 38.8 L 96.2 38.2 L 98.7 37.7 L 101.2 37.1 L 103.7 36.5 L 106.2 35.9 L 108.7 35.3 L 111.2 34.7 L 113.7 34.1 L 116.2 33.6 L 118.7 33.1 L 121.1 32.5 L 123.6 32.1 L 126.0 31.6 L 128.5 31.2 L 130.9 30.8 L 133.3 30.5 L 135.7 30.2 L 138.1 30.0 L 140.5 29.8 L 142.9 29.6 L 145.2 29.5 L 147.6 29.5 L 149.9 29.5 L 152.3 29.6 L 154.6 29.7 L 157.0 29.9 L 159.3 30.1 L 161.6 30.4 L 164.0 30.8 L 166.3 31.2 L 168.6 31.6 L 171.0 32.2 L 173.3 32.7 L 175.7 33.3 L 178.0 34.0 L 180.4 34.6 L 182.8 35.4 L 185.2 36.1 L 187.6 36.8 L 190.1 37.6 L 192.5 38.4 L 195.0 39.2 L 197.4 40.0 L 199.9 40.8 L 202.5 41.7 L 205.0 42.5 L 207.5 43.2 L 210.1 44.0 L 212.7 44.7 L 215.3 45.4 L 217.9 46.1 L 220.5 46.7 L 223.1 47.3 L 225.8 47.8 L 228.4 48.2 L 231.1 48.5 L 232.9 40.9 L 230.6 40.0 L 228.3 39.0 L 225.9 38.1 L 223.6 37.1 L 221.2 36.1 L 218.8 35.0 L 216.5 34.0 L 214.1 33.0 L 211.7 31.9 L 209.2 30.9 L 206.8 29.9 L 204.3 28.9 L 201.8 27.9 L 199.3 26.9 L 196.8 26.0 L 194.3 25.0 L 191.8 24.2 L 189.2 23.3 L 186.6 22.6 L 184.0 21.8 L 181.4 21.1 L 178.8 20.5 L 176.2 20.0 L 173.5 19.5 L 170.9 19.0 L 168.3 18.7 L 165.6 18.3 L 163.0 18.1 L 160.3 17.9 L 157.7 17.8 L 155.1 17.7 L 152.4 17.7 L 149.8 17.8 L 147.2 17.9 L 144.6 18.1 L 141.9 18.4 L 139.3 18.7 L 136.8 19.0 L 134.2 19.4 L 131.6 19.9 L 129.0 20.4 L 126.5 21.0 L 123.9 21.5 L 121.4 22.2 L 118.9 22.8 L 116.4 23.5 L 113.8 24.2 L 111.3 24.9 L 108.9 25.6 L 106.4 26.3 L 103.9 27.1 L 101.4 27.8 L 99.0 28.6 L 96.5 29.3 L 94.0 30.0 L 91.6 30.7 L 89.2 31.4 L 86.7 32.1 L 84.3 32.7 L 81.8 33.4 L 79.4 34.0 L 77.0 34.5 L 74.6 35.1 L 72.1 35.6 L 69.7 36.0 L 67.3 36.5 L 64.9 36.8 L 62.4 37.2 L 60.0 37.5 L 57.6 37.8 L 55.2 38.0 L 52.7 38.2 L 50.3 38.3 L 47.8 38.4 L 45.4 38.5 L 42.9 38.5 L 40.5 38.5 L 38.0 38.5 L 35.5 38.4 L 33.1 38.3 L 30.6 38.2 L 28.1 38.0 L 25.6 37.8 L 23.1 37.6 L 20.7 37.4 L 18.2 37.1 L 15.7 36.9 L 13.1 36.6 L 10.6 36.4 L 8.1 36.2 Z" />

      {/* The dorsal crest: twelve spines along the top edge, growing towards
          the head. Sampled off the same centreline, so they sit on the body
          rather than near it. */}
      <path d="M 40.4 43.3 L 42.7 46.0 L 45.2 43.5 Z M 55.6 43.9 L 58.1 46.5 L 60.4 43.6 Z M 70.9 42.9 L 73.8 45.4 L 75.6 42.1 Z M 86.2 40.4 L 89.3 42.9 L 90.9 39.3 Z M 101.4 37.1 L 104.6 39.7 L 106.1 35.9 Z M 116.3 33.6 L 119.5 36.4 L 121.0 32.5 Z M 130.9 30.9 L 133.9 34.1 L 135.7 30.1 Z M 145.2 29.6 L 147.7 33.3 L 150.0 29.4 Z M 159.2 30.2 L 161.2 34.4 L 164.0 30.7 Z M 173.4 32.8 L 174.7 37.4 L 178.0 33.9 Z M 187.8 36.9 L 188.7 41.7 L 192.3 38.4 Z M 202.7 41.6 L 203.4 46.7 L 207.2 43.3 Z" />

      {/* The tail fin — a spray of three blades, which is where a Chinese
          dragon ends rather than in a point. */}
      <path d="M9 36.8 L 3 27.6 L 5.6 35.8 L 0.6 33.8 L 4.8 38 L 1.4 44 L 7.2 38.9 Z" />

      {/*
        The head.

        Built as a wedge rather than a circle: the snout is long and squared,
        the jaw drops away underneath it, and the skull is deepest just behind
        the eye. That profile is most of what separates a Chinese dragon's head
        from a snake's at silhouette size.
      */}
      <path d="M231 40.4c4-2.2 9.6-2.6 14.4-1.2 4.6 1.3 8.4 3.4 10.9 5.6.8.7.6 1.6-.5 1.9-2.6.6-4.9.6-7.2.2.7 1.4.6 2.7-.4 3.6-.7.6-1.7.5-2.3-.3-1.2-1.6-2.9-2.8-4.9-3.5-3.6.9-7.3.7-10.6-.6l.6-5.7Z" />

      {/* Two horns, sweeping back over the neck. */}
      <path d="M240.5 38.2c-1-3-3.4-5.6-6.7-7.2-.8-.4-.5-1.4.4-1.3 4.6.5 8.2 3.3 9.6 7.4l-3.3 1.1Z" />
      <path d="M235.2 38.4c-1.8-2.6-4.6-4.4-8.2-5.2-.9-.2-.9-1.2 0-1.3 4.8-.5 9 1.5 11.2 5.2l-3 1.3Z" />

      {/* The eye. Surface-coloured so it is a hole in the silhouette — the one
          place the page shows through, which is what makes it read as an eye
          at four pixels across. */}
      <circle cx="243.4" cy="42.4" r="1.5" fill="rgb(var(--surface))" />

      {/* The mane, behind the skull. */}
      <path d="M233.6 37.6c-2.4-1.2-5.2-1.6-8.4-1.2l1 2.6c2.6-.7 5-.6 7.4.2v-1.6Z" opacity="0.85" />
    </g>

    {/*
      Whiskers, drawn rather than filled.

      The one part of the animal that is a line: two long barbels trailing back
      from the snout, and they are what makes a serpent read as a *dragon* from
      across a room. Stroked so they keep their weight when the whole glyph is
      scaled down.
    */}
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none">
      <path d="M252.4 47.2c-2.8 5.2-8.6 8-17.4 8.4" />
      <path d="M248.6 49.4c-1.6 4.6-6.2 7.6-13.8 9" />
    </g>

    {/*
      Four legs, at the shoulder and the hip on both sides of the body.

      The near pair are solid; the far pair are the same shape at lower opacity
      and slightly higher, which is the cheapest possible depth cue and the only
      one that survives being drawn at 8% alpha behind a page.
    */}
    <g fill="currentColor">
      <g opacity="0.55">
        <path d="M166 24.5c-1.8 3.4-1.4 6.8 1.2 10.2l2.6-1.4c-1.8-2.8-2-5.4-.6-7.8l-3.2-1Z" />
        <path d="M86.5 35.2c-2 3.2-1.8 6.6.6 10.2l2.7-1.3c-1.7-2.9-1.8-5.5-.3-7.9l-3-1Z" />
      </g>
      {/* Near shoulder, with three claws. */}
      <path d="M171.4 26.6c-2.4 3.8-2.2 7.8.6 12l3-1.6c-2-3.2-2.2-6.2-.6-9.2l-3-1.2Z" />
      <path d="M171.6 37.4l-2.4 4.2 1.4.6 2-3.4Zm1.6.8-.8 4.6 1.6.2.6-4.2Zm1.8.2.8 4.4 1.5-.5-1.1-4.2Z" />
      {/* Near hip. */}
      <path d="M92 37.4c-2.6 3.6-2.6 7.6 0 12l3-1.5c-1.9-3.2-1.9-6.2-.2-9.3l-2.8-1.2Z" />
      <path d="M92 47.8l-2.2 4.3 1.4.6 1.9-3.5Zm1.7.7-.7 4.7 1.6.1.5-4.2Zm1.8.1.9 4.4 1.5-.5-1.2-4.2Z" />
    </g>
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

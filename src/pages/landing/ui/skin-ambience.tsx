import { useMemo, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import type { ThemeSkin } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { BatGlyph } from '@/shared/ui/halloween-icons';

/**
 * The seven skins that do something to the *room*, and what each one does.
 *
 * Deliberately a table here rather than a flag on the catalogue: this is a
 * property of the landing page's ability to *preview* an animation, not of the
 * skin itself. A skin whose ambience has not been drawn for this component
 * simply is not in the table, and everything downstream reads `null` and
 * renders nothing — which is also the honest answer for the seven that have no
 * ambient animation at all.
 *
 * The tones are literal hex for the same reason `SkinPreview`'s colours are: a
 * preview has to paint itself in a palette that is *not* the active one, and a
 * CSS variable cannot do that. They are the decoration's own colours rather
 * than the skin's brand — autumn leaves are not brand-coloured, and a field of
 * accent-tinted anything reads as a loading state.
 */
const AMBIENCE = {
  AUTUMN: { kind: 'leaves', tones: ['#c2410c', '#ca8a04'], count: 9 },
  VOLCANO: { kind: 'embers', tones: ['#fb923c', '#ef4444'], count: 12 },
  UNDERWATER: { kind: 'bubbles', tones: ['#7dd3fc', '#e0f2fe'], count: 11 },
  HAZARD: { kind: 'motes', tones: ['#a3ff2a', '#84cc16'], count: 11 },
  HALLOWEEN: { kind: 'bats', tones: ['#1c1420', '#ff8c28'], count: 7 },
  RUNIC: { kind: 'runes', tones: ['#b45309', '#f59e0b'], count: 5 },
  ELDRITCH: { kind: 'eyes', tones: ['#2dd4bf', '#a855f7'], count: 4 },
  DRAGON: { kind: 'lanterns', tones: ['#e05833', '#f2c54f'], count: 7 },
} as const satisfies Partial<
  Record<ThemeSkin, { kind: string; tones: readonly [string, string]; count: number }>
>;

export type AmbientSkin = keyof typeof AMBIENCE;

/** Whether this skin has an ambience the landing page knows how to draw. */
export const hasAmbience = (skin: ThemeSkin): skin is AmbientSkin => skin in AMBIENCE;

/**
 * A deterministic pseudo-random sequence.
 *
 * Not `Math.random()`, for the reason every scatter in this codebase avoids it:
 * a field somebody has looked at and approved should be the same field next
 * time. A hash of the index is reproducible across renders, across reloads and
 * across the two places this component is mounted, so the preview box and the
 * page section are visibly the same weather rather than two unrelated ones.
 */
const noise = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  tone: 0 | 1;
  top: number;
}

const buildField = (count: number, offset: number): Particle[] =>
  Array.from({ length: count }, (_, index) => {
    const a = noise(index + offset);
    const b = noise(index * 3.7 + offset);
    const c = noise(index * 7.1 + offset);

    return {
      // Spread across the width on a jittered grid rather than at random: pure
      // noise clumps, and a gap of a third of the box reads as a bug.
      left: ((index + 0.5) / count) * 100 + (a - 0.5) * (60 / count),
      top: b * 100,
      size: 0.6 + c * 0.9,
      duration: 7 + a * 9,
      // Negative, so the field is already mid-flight on the first frame. A
      // preview that starts empty and fills over ten seconds shows nothing at
      // the moment somebody looks at it, which is the only moment that counts.
      delay: -(b * 14),
      drift: (c - 0.5) * 2,
      spin: 3 + a * 4,
      tone: index % 2 === 0 ? 0 : 1,
    };
  });

/* -------------------------------------------------------------------------- *
 * The glyphs
 * -------------------------------------------------------------------------- */

const LeafGlyph = ({ fill }: { fill: string }) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
    <path
      d="M12 2c5 3 9 7 9 12 0 4-3 8-9 8s-9-4-9-8c0-5 4-9 9-12Z"
      fill={fill}
      transform="rotate(18 12 12)"
    />
    <path d="M12 4v16" stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.1" fill="none" />
  </svg>
);

/**
 * A paper lantern, for the imperial skin.
 *
 * Deliberately not the dragon. The dragon is a 264-unit glyph that takes eleven
 * seconds to cross a whole viewport — inside a preview box a few hundred pixels
 * wide it would be a red smear passing every second or so, which sells the
 * wrong thing about the theme. Lanterns rising are the same room without the
 * set piece in it, and they read at 14 pixels.
 *
 * Two colours: the paper takes the accent, the cap and the base take the metal.
 */
const LanternGlyph = ({ fill, trim }: { fill: string; trim: string }) => (
  <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden>
    {/* The hanging cord and the top cap. */}
    <path d="M8 0v3" stroke={trim} strokeWidth="1.2" fill="none" />
    <rect x="4.5" y="3" width="7" height="1.8" rx="0.6" fill={trim} />
    {/* The paper body: barrel-shaped, which is the whole silhouette. */}
    <path d="M8 4.8c4.4 0 6.4 2.6 6.4 6.2S12.4 17.2 8 17.2 1.6 14.6 1.6 11 3.6 4.8 8 4.8Z" fill={fill} />
    {/* Two ribs, so the paper reads as stretched over a frame. */}
    <g stroke={trim} strokeWidth="0.7" strokeOpacity="0.55" fill="none">
      <path d="M4.4 5.9c-1 1.5-1.4 3.2-1.4 5.1s.4 3.6 1.4 5.1" />
      <path d="M11.6 5.9c1 1.5 1.4 3.2 1.4 5.1s-.4 3.6-1.4 5.1" />
    </g>
    {/* The base, and the tassel hanging off it. */}
    <rect x="4.5" y="17.2" width="7" height="1.8" rx="0.6" fill={trim} />
    <path d="M8 19v4" stroke={fill} strokeWidth="1.4" fill="none" />
  </svg>
);

const RuneGlyph = ({ fill }: { fill: string }) => (
  <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden fill="none">
    <g stroke={fill} strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 2v20" />
      <path d="M4 5l8 5-8 5" />
    </g>
  </svg>
);

const EyeGlyph = ({ fill, pupil }: { fill: string; pupil: string }) => (
  <svg viewBox="0 0 32 20" className="h-full w-full" aria-hidden>
    <path d="M16 1c8 0 15 6 15 9s-7 9-15 9S1 13 1 10 8 1 16 1Z" fill={fill} fillOpacity="0.85" />
    <ellipse cx="16" cy="10" rx="3" ry="8" fill={pupil} />
  </svg>
);

/* -------------------------------------------------------------------------- *
 * The field
 * -------------------------------------------------------------------------- */

interface SkinAmbienceProps {
  skin: ThemeSkin;
  /**
   * Dials the whole field down. The page section carries a *lot* more area than
   * the preview box, and a density that reads as weather in a 300px window
   * reads as an infestation across a 1200px band.
   */
  density?: number;
  className?: string;
}

/**
 * The thing a skin does to the room it is in, drawn inside a box.
 *
 * ## Why this is not the app's own decor components
 *
 * `AutumnFall`, `EmberRise`, `BubbleRise` and the rest are all `position:
 * fixed`, gated on `useSkin()`, and — the part that actually rules them out —
 * their keyframes travel in `vh`. A leaf falling `120vh` inside a 300px preview
 * box crosses it in the first eighth of its animation and then spends six
 * seconds somewhere below the page. They are correct for what they are: weather
 * over the whole application. This is a different problem that happens to look
 * the same.
 *
 * So the travel here is in **container query units** (`cqh`/`cqw`), which
 * resolve against this box rather than the viewport. That is the single
 * decision that lets one component serve a 300px preview and a 1200px page band
 * with no per-site numbers at all — and it is why the sizes are in `cqmin` too,
 * so a leaf is proportionate to the window it is falling through.
 *
 * ## Why an arbitrary skin rather than the active one
 *
 * Because the whole point of the showcase is previewing a theme you have *not*
 * applied. The palette comes in as literal hex on a CSS variable (see
 * `AMBIENCE`) rather than from `--brand`, which would resolve to whatever skin
 * the reader is currently wearing and paint every preview the same colour.
 *
 * Renders nothing at all for a skin with no ambience, and nothing under
 * `prefers-reduced-motion` — this is pure atmosphere carrying no information,
 * so the honest reduced-motion answer is to leave it out rather than to show a
 * still frame of it.
 */
export const SkinAmbience = ({ skin, density = 1, className }: SkinAmbienceProps) => {
  const reduceMotion = useReducedMotion();
  const spec = hasAmbience(skin) ? AMBIENCE[skin] : null;

  const count = spec ? Math.max(3, Math.round(spec.count * density)) : 0;

  /*
   * Keyed on the skin so turning the barrel rebuilds the field rather than
   * leaving one skin's leaves falling in the next one's colours, and memoised
   * so the parent's re-render (the wheel fires several a second) does not
   * reshuffle a field that is mid-flight.
   */
  const field = useMemo(
    () => (spec ? buildField(count, spec.kind.length * 11) : []),
    [spec, count],
  );

  if (!spec || reduceMotion) return null;

  const [toneA, toneB] = spec.tones;

  return (
    <div
      aria-hidden
      className={cn('sa-field pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {field.map((p, index) => {
        const fill = p.tone === 0 ? toneA : toneB;

        const style = {
          left: `${p.left}%`,
          '--sa-size': `${p.size}`,
          '--sa-life': `${p.duration}s`,
          '--sa-delay': `${p.delay}s`,
          '--sa-drift': `${p.drift * 12}cqw`,
          '--sa-spin': `${p.spin}s`,
        } as CSSProperties;

        switch (spec.kind) {
          case 'leaves':
            return (
              <span key={index} className="sa-drop" style={style}>
                {/* Two elements: the outer owns the fall and the sway, the inner
                    owns the tumble. One box cannot animate two transforms — the
                    second simply replaces the first. */}
                <span className="sa-spin" style={{ animationDirection: index % 2 ? 'reverse' : 'normal' }}>
                  <LeafGlyph fill={fill} />
                </span>
              </span>
            );

          case 'embers':
            return (
              <span
                key={index}
                className="sa-rise sa-ember"
                style={{ ...style, background: fill, boxShadow: `0 0 10px 2px ${fill}` }}
              />
            );

          case 'bubbles':
            return (
              <span
                key={index}
                className="sa-rise sa-bubble"
                style={{ ...style, borderColor: fill }}
              />
            );

          case 'motes':
            return (
              <span
                key={index}
                className="sa-rise sa-mote"
                style={{ ...style, background: fill, boxShadow: `0 0 8px 1px ${fill}` }}
              />
            );

          case 'bats':
            return (
              /*
               * The app's own bat, not a flat copy of it.
               *
               * This used to be a second silhouette declared in this file, with
               * its own path and its own idea of a flap — so the bats crossing
               * the preview were a different animal from the ones coming off a
               * dialog, and only one of the two got fixed whenever either was.
               * `BatGlyph` is rigged (see `halloween-icons.tsx`) and animates
               * its own wings, so the wrapper that used to squash the whole
               * glyph is gone with it.
               *
               * Colour comes from `--hw-bat-ink` rather than from `toneA`,
               * which is the one place this component reads a live token
               * instead of a literal — and it has to. The tone is a fixed
               * near-black, which is correct over the light half of the compare
               * box and invisible over the dark one; the token is the only
               * value that knows which of those the reader is looking at.
               * `--bat-flap` slows the beat: these are crossing a sky, not
               * passing your face.
               */
              <span
                key={index}
                className="sa-cross"
                style={{
                  ...style,
                  top: `${p.top}%`,
                  color: 'rgb(var(--hw-bat-ink))',
                  ['--bat-flap' as string]: '0.42s',
                  filter: 'drop-shadow(0 0 4px rgb(var(--hw-bat-rim) / 0.5))',
                }}
              >
                <BatGlyph className="h-full w-full" />
              </span>
            );

          case 'runes':
            return (
              <span
                key={index}
                className="sa-flare"
                style={{ ...style, top: `${p.top}%`, filter: `drop-shadow(0 0 6px ${toneB})` }}
              >
                <RuneGlyph fill={fill} />
              </span>
            );

          case 'eyes':
            return (
              <span key={index} className="sa-blink" style={{ ...style, top: `${p.top}%` }}>
                <EyeGlyph fill={toneA} pupil={toneB} />
              </span>
            );

          /*
           * Lanterns go *up*, on the same `sa-rise` the embers and bubbles use.
           *
           * The glow is a drop-shadow in the lantern's own red rather than a
           * `box-shadow` on the box, because the box is a rectangle and the
           * lantern is not — a box-shadow would put a rectangular halo behind
           * a rounded object, which is exactly what it looks like.
           */
          case 'lanterns':
            return (
              <span
                key={index}
                className="sa-rise"
                style={{ ...style, filter: `drop-shadow(0 0 6px ${toneA}88)` }}
              >
                <LanternGlyph fill={toneA} trim={toneB} />
              </span>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};

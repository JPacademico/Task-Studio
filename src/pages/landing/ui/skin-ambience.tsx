import { useMemo, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import type { ThemeSkin } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { BatGlyph } from '@/shared/ui/halloween-icons';

/**
 * The skins that do something to the *room*, and what each one does. Deliberately a table here
 * rather than a flag on the catalogue.
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
  // Not weather but a place: the city along the foot of the band, and the breath across it now and
  // then. Drawn from the skin's own tokens, so it follows the palette; the tones are unused.
  KAIJU: { kind: 'city', tones: ['#9640ff', '#f6ecff'], count: 1 },
  // A mid sky blue for the tail and near-white for the head: the one pairing that reads on both
  // halves of the compare box.
  SPACE: { kind: 'meteors', tones: ['#38bdf8', '#f0f9ff'], count: 2 },
} as const satisfies Partial<
  Record<ThemeSkin, { kind: string; tones: readonly [string, string]; count: number }>
>;

export type AmbientSkin = keyof typeof AMBIENCE;

/**
 * The kinds that happen *in place* rather than travelling. A leaf or an ember covers the box by
 * crossing it, so a handful is enough however wide the box is.
 */
const PLACED_KINDS: ReadonlySet<string> = new Set(['runes', 'eyes']);

/** Whether this skin has an ambience the landing page knows how to draw. */
export const hasAmbience = (skin: ThemeSkin): skin is AmbientSkin => skin in AMBIENCE;

/** A deterministic pseudo-random sequence. */
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

const buildField = (count: number, offset: number, isPlaced = false): Particle[] =>
  Array.from({ length: count }, (_, index) => {
    const a = noise(index + offset);
    const b = noise(index * 3.7 + offset);
    const c = noise(index * 7.1 + offset);

    return {
      // Spread across the width on a jittered grid rather than at random: pure
      // noise clumps, and a gap of a third of the box reads as a bug.
      left: ((index + 0.5) / count) * 100 + (a - 0.5) * (60 / count),
      // Down the height, the same argument for the things that stay put. Pure noise put two of
      // three runes in the bottom fifth of the band on the landing page.
      top: isPlaced ? ((index * 0.618_034 + b * 0.25) % 1) * 100 : b * 100,
      size: 0.6 + c * 0.9,
      duration: 7 + a * 9,
      // Negative, so the field is already mid-flight on the first frame.
      delay: -(b * 14),
      drift: (c - 0.5) * 2,
      spin: 3 + a * 4,
      tone: index % 2 === 0 ? 0 : 1,
    };
  });

// --- The glyphs ---

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
 * A paper lantern, for the imperial skin. Deliberately not the dragon. The dragon is a 264-unit
 * glyph that takes eleven seconds to cross a whole viewport.
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

// --- The field ---

interface SkinAmbienceProps {
  skin: ThemeSkin;
  /**
   * Dials the whole field down. The page section carries a *lot* more area than the preview box.
   */
  density?: number;
  /**
   * How much wider than tall the box is, roughly. Only the kinds that stay in place use it (see
   * `PLACED_KINDS`).
   */
  span?: number;
  className?: string;
}

/**
 * The thing a skin does to the room it is in, drawn inside a box. `AutumnFall`, `EmberRise`,
 * `BubbleRise` and the rest are all `position: fixed`, gated on `useSkin()`.
 */
export const SkinAmbience = ({ skin, density = 1, span = 1, className }: SkinAmbienceProps) => {
  const reduceMotion = useReducedMotion();
  const spec = hasAmbience(skin) ? AMBIENCE[skin] : null;
  const isPlaced = spec ? PLACED_KINDS.has(spec.kind) : false;

  // Shooting stars are the exception to the floor of three: they are timed rather than scattered
  // (see the `meteors` case).
  const count = !spec
    ? 0
    : spec.kind === 'meteors'
      ? spec.count
      : Math.max(3, Math.round(spec.count * density * (isPlaced ? Math.max(1, span) : 1)));

  // Keyed on the skin so turning the barrel rebuilds the field rather than leaving one skin's
  // leaves falling in the next one's colours, and memoised so the parent's re-render.
  const field = useMemo(
    () => (spec ? buildField(count, spec.kind.length * 11, isPlaced) : []),
    [spec, count, isPlaced],
  );

  if (!spec) return null;

  // The city stands still, so it stays under reduced motion; only the beam is motion.
  if (spec.kind === 'city') {
    return (
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      >
        <span className="sa-kaiju-city" />
        {!reduceMotion && (
          <span className="sa-kaiju-beam">
            <i />
          </span>
        )}
      </div>
    );
  }

  if (reduceMotion) return null;

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
                {/* Two elements: the outer owns the fall and the sway, the inner owns the
                    tumble. */}
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
              /* The app's own bat, not a flat copy of it. This used to be a second silhouette
                 declared in this file, with its own path and its own idea of a flap. */
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

          // The two that stay put are placed through `--sa-top`/`--sa-left` rather than
          // `top`/`left`: the stylesheet clamps them by the glyph's own size.
          case 'runes':
            return (
              <span
                key={index}
                className="sa-flare"
                style={{
                  ...style,
                  left: undefined,
                  '--sa-left': `${p.left}cqw`,
                  '--sa-top': `${p.top}cqh`,
                  filter: `drop-shadow(0 0 6px ${toneB})`,
                } as CSSProperties}
              >
                <RuneGlyph fill={fill} />
              </span>
            );

          case 'eyes':
            return (
              <span
                key={index}
                className="sa-blink"
                style={{
                  ...style,
                  left: undefined,
                  '--sa-left': `${p.left}cqw`,
                  '--sa-top': `${p.top}cqh`,
                } as CSSProperties}
              >
                <EyeGlyph fill={toneA} pupil={toneB} />
              </span>
            );

          // A shooting star: across the box and gone in under a second. The app's own
          // (`ShootingStar`) keeps a one-minute cooldown.
          case 'meteors':
            return (
              <span
                key={index}
                className="sa-meteor"
                style={{
                  ...style,
                  left: undefined,
                  '--sa-top': `${8 + p.top * 0.4}cqh`,
                  '--sa-life': '9s',
                  '--sa-delay': `${-((index * 9) / count + 2.4)}s`,
                  '--sa-tail': toneA,
                  '--sa-head': toneB,
                } as CSSProperties}
              />
            );

          // Lanterns go *up*, on the same `sa-rise` the embers and bubbles use. The glow is a
          // drop-shadow in the lantern's own red rather than a `box-shadow` on the box.
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

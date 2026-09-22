import type { ReactElement } from 'react';

import { useSkin } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';

/**
 * Waiting, drawn in the active skin.
 *
 * A skin owns its type, its corners and its motion curve, so a single grey
 * spinner in the middle of all six of them was the one moment the illusion
 * dropped. Each loader below is the same idea expressed in that skin's own
 * material: ink for the illustrated one, a block caret for the CRT, geared
 * brass for the vintage plates, stepped sprites for the arcade, a satellite on
 * an orbit for the deep field.
 *
 * Every one of them is CSS on two or three nodes animating transform/opacity
 * only — see the `.loader-*` block in `index.css`. Nothing here runs a
 * JavaScript animation, so a page can hold several without costing a frame,
 * and `prefers-reduced-motion` flattens all of them through the global rule.
 */

/** A cog, drawn once and reused at two sizes by the vintage loader. */
const Cog = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 2.6l1.5 2.1 2.5-.6.4 2.5 2.3 1.1-1.2 2.3 1.2 2.3-2.3 1.1-.4 2.5-2.5-.6L12 21.4l-1.5-2.1-2.5.6-.4-2.5-2.3-1.1 1.2-2.3-1.2-2.3 2.3-1.1.4-2.5 2.5.6L12 2.6Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.2" fill="rgb(var(--surface))" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const BODY: Record<ThemeSkin, ReactElement> = {
  STUDIO: <span className="loader-arc" />,

  PAPER: (
    <span className="loader-dots">
      <i />
      <i />
      <i />
    </span>
  ),

  TERMINAL: (
    <span className="loader-caret">
      <span>LOADING</span>
      <b />
    </span>
  ),

  VINTAGE: (
    <span className="loader-gears">
      <Cog />
      <Cog />
    </span>
  ),

  PIXEL: (
    <span className="loader-blocks">
      <i />
      <i />
      <i />
      <i />
    </span>
  ),

  SPACE: (
    <span className="loader-orbit">
      <span className="ring" />
      <span className="core" />
      <span className="sat" />
    </span>
  ),

  // A dial ticking round in twelve notches, not a spinner sweeping smoothly.
  HAZARD: <span className="loader-trefoil" />,

  // The oldest cliché in the business, and the only honest way to say
  // "the edition is being printed": the front page spinning at the reader.
  NEWSPAPER: (
    <span className="loader-press">
      <i />
      <i />
    </span>
  ),

  // Not a progress indicator. Something is deciding whether to let you in.
  ELDRITCH: (
    <span className="loader-eye">
      <i />
      <i />
    </span>
  ),

  // One leaf, tumbling down and starting again. The only loader in the set
  // that is not a machine working — it is just something taking its time.
  AUTUMN: (
    <span className="loader-leaf">
      <i />
    </span>
  ),

  /*
   * Not a spinner. A rune being cut, holding its light, and worn away again.
   *
   * `pathLength="100"` is what makes the draw-on work: it renormalises the
   * stave to a hundred units so `stroke-dasharray: 100` in the stylesheet is
   * exactly one full stroke, whatever the path measures. Redrawing the rune
   * then cannot silently break the animation.
   *
   * The ring around it ratchets through eight notches rather than sweeping —
   * this skin has no smooth motion anywhere else either.
   */
  RUNIC: (
    <span className="loader-rune">
      <svg viewBox="0 0 40 40" fill="none">
        <g className="loader-rune__ring" stroke="currentColor" strokeWidth="2" opacity="0.45">
          <path d="M20 3v4M20 33v4M3 20h4M33 20h4" />
          <path d="M8 8l2.8 2.8M29.2 29.2 32 32M32 8l-2.8 2.8M10.8 29.2 8 32" opacity="0.6" />
        </g>
        <path
          className="loader-rune__stave"
          pathLength="100"
          d="M20 7v26M20 14l-7 7M20 21l7-7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="square"
        />
      </svg>
    </span>
  ),

  // Not a machine working. Something is breathing, and these are what is left
  // over — three bubbles wobbling their way out on their own schedule.
  UNDERWATER: (
    <span className="loader-bubbles">
      <i />
      <i />
      <i />
    </span>
  ),

  // Not a progress indicator: pressure. It swells for nine tenths of the cycle
  // and lets go in the last tenth, which is this skin's motion curve drawn as
  // a loop.
  VOLCANO: (
    <span className="loader-magma">
      <i />
      <b />
    </span>
  ),
  /*
   * A jack-o'-lantern whose face lights in three steps.
   *
   * The body does not spin, bounce or pulse as a whole — it is a lantern, and a
   * lantern that moves reads as being carried. What animates is the *light*:
   * the two eyes and the grin come up in sequence and fall back, which is a
   * loop with a direction to it, so it says "still going" the way a spinner
   * does without anything travelling.
   *
   * Three nodes, animating opacity only. See `.loader-pumpkin` in `index.css`.
   */
  HALLOWEEN: (
    <span className="loader-pumpkin">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        {/* The stalk. */}
        <path
          d="M12 5.2c0-1.4.5-2.4 1.7-2.9"
          stroke="rgb(var(--positive))"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Three lobes, so it reads as a pumpkin rather than a circle. */}
        <ellipse cx="12" cy="14" rx="8.4" ry="7.4" fill="currentColor" />
        <ellipse cx="12" cy="14" rx="3.1" ry="7.4" fill="rgb(var(--surface))" fillOpacity="0.14" />
        {/* The carved face. Surface-coloured, so these are holes. */}
        <g fill="rgb(var(--surface))">
          <path className="loader-pumpkin__eye" d="M8.1 11.3l2.7 1.7-2.7 1.7v-3.4Z" />
          <path className="loader-pumpkin__eye" d="M15.9 11.3v3.4l-2.7-1.7 2.7-1.7Z" />
          <path
            className="loader-pumpkin__grin"
            d="M7.6 16.4h8.8c-.6 1.7-2.3 2.8-4.4 2.8s-3.8-1.1-4.4-2.8Zm2 .9.7 1 .7-1h-1.4Zm3.4 0 .7 1 .7-1h-1.4Z"
          />
        </g>
      </svg>
    </span>
  ),

  /*
   * A gradient ring, spinning. The single most-shipped loading indicator on the
   * web, and the only honest one for this skin: a spinner with a conic gradient
   * and rounded ends is what the snippet produces, so that is what it gets.
   *
   * `loader-vibe` is two elements rather than a `border` trick because the
   * border version cannot hold a gradient — see `index.css`.
   */
  VIBECODED: (
    <span className="loader-vibe">
      <i />
    </span>
  ),

  /*
   * A scroll unrolling, and rolling back.
   *
   * The loop is the gesture the whole skin is built on: two lacquered rods and
   * a sheet of silk between them, the sheet widening and narrowing while the
   * rods travel apart and back together. Nothing spins, because nothing in an
   * imperial hall spins — waiting here is something being *opened*, which is
   * also the honest metaphor for what a loading state is.
   *
   * Three nodes: the two rods and the silk. The rods translate, the silk
   * scales on its own X axis, and all three run off one keyframe set so they
   * cannot drift out of step. See `.loader-scroll` in `index.css`.
   */
  DRAGON: (
    <span className="loader-scroll">
      <i />
      <b />
      <i />
    </span>
  ),
};

interface SkinLoaderProps {
  /** `sm` is the inline size used inside buttons and rows. */
  size?: 'sm' | 'md';
  /**
   * `inherit` takes the surrounding text colour — needed inside a filled
   * control, where the brand colour is the background it would sit on.
   */
  tone?: 'brand' | 'inherit';
  className?: string;
  /** Announced to assistive tech; the visual is decorative. */
  label?: string;
}

export const SkinLoader = ({
  size = 'md',
  tone = 'brand',
  className,
  label = 'Loading',
}: SkinLoaderProps) => {
  const skin = useSkin();

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'skin-loader',
        size === 'sm' && 'skin-loader--sm',
        tone === 'inherit' && 'skin-loader--inherit',
        className,
      )}
    >
      {BODY[skin] ?? BODY.STUDIO}
    </span>
  );
};

/**
 * The caption under a full-page loader.
 *
 * The CRT already writes "LOADING" inside its own glyph, so repeating the
 * label underneath it reads as a stutter — every other skin keeps it.
 */
export const skinLoaderWantsCaption = (skin: ThemeSkin): boolean => skin !== 'TERMINAL';

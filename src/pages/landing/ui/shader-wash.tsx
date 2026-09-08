import { Suspense, lazy, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useCanvasBudget, useCanvasPixelRatio } from '@/shared/lib/use-canvas-budget';
import { useThemePalette } from '@/shared/lib/theme-colors';

/**
 * A flowing gradient, in place of a two-stop CSS one.
 *
 * ## What this replaces, and what it deliberately does not
 *
 * The product has fifty-odd `linear-gradient` and `radial-gradient`
 * declarations, and almost none of them are candidates for this. They fall into
 * three groups and only the last one is a "gradient" in the sense that matters:
 *
 *   - **Structural.** Fade masks on the integrations belt and the theme strip,
 *     the hairline rules down the sidebar and under the top bar, the edge
 *     affordances. These are not decoration; they are how the interface says
 *     "there is more this way" and where one surface stops. A shader cannot do
 *     a one-pixel lit rule, and replacing them would break the thing they are
 *     for.
 *   - **Entity colour.** The wash on a project card, a task card, a team row —
 *     `linear-gradient(120deg, <that project's colour>, transparent)`. Each is
 *     a tint carrying a specific piece of information, there are dozens on
 *     screen at once, and a WebGL context per card is not a thing anybody can
 *     ship.
 *   - **Decorative page-scale washes.** Large, purely atmospheric, one per
 *     screen, and the reason the page looks like every other landing page. Two
 *     of those exist and this is for them.
 *
 * ## Why the CSS gradient stays underneath
 *
 * It is painted by the parent, not here, and it is never removed. It is the
 * first paint, the fallback on a device that refuses the canvas, the fallback
 * for reduced motion, and what is on screen for the fraction of a second while
 * three.js is fetched. A section whose background arrives late is a section
 * that flashes; this one simply gets deeper.
 *
 * ## Why it is capped so far down
 *
 * `opacity` here is a ceiling on the whole effect, and it is low on purpose.
 * Everything in front of this is text, and a gradient that animates through a
 * light patch behind a paragraph is a paragraph that becomes unreadable once
 * every eight seconds — a failure that is invisible in review because it is not
 * on screen at the moment anybody looks. The wash is allowed to change the
 * *character* of the surface and not its luminance.
 */

/*
 * Both halves of the library, loaded on demand.
 *
 * `@shadergradient/react` pulls in `three` and `@react-three/fiber`, which
 * together are the largest thing in the repository by an order of magnitude.
 * Behind a `lazy` they are a separate chunk that is only ever fetched by a
 * visitor who has scrolled a decorative section into view on a machine that
 * passed `useCanvasBudget` — which is to say: never, on a phone, on a metered
 * connection, or for anybody who has asked for reduced motion.
 */
const ShaderGradientCanvas = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradientCanvas })),
);

const ShaderGradient = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradient })),
);

interface ShaderWashProps {
  /**
   * The character of the surface.
   *
   * `calm` is a slow horizontal drift for a section somebody is reading; `swell`
   * has more vertical relief and a little more speed, for one they are looking
   * at. Both are the same shader with different numbers — the names exist so a
   * caller states an intention rather than tuning nine floats at the call site.
   */
  mood?: 'calm' | 'swell';
  /** The ceiling on the whole effect. See above: text sits in front of this. */
  opacity?: number;
  className?: string;
}

export const ShaderWash = ({ mood = 'calm', opacity = 0.55, className }: ShaderWashProps) => {
  const host = useRef<HTMLDivElement>(null);
  const canRender = useCanvasBudget(host);
  const pixelRatio = useCanvasPixelRatio(1.5);
  const palette = useThemePalette();

  const isSwell = mood === 'swell';

  return (
    <div
      ref={host}
      aria-hidden
      /*
       * `pointer-events-none` is not optional. Every use of this sits behind
       * content with links and buttons in it, and a canvas stretched across the
       * section would otherwise swallow every click in it.
       */
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ opacity }}
    >
      {canRender && (
        /*
         * No fallback, on purpose.
         *
         * A spinner or a placeholder behind a headline would be a visible
         * loading state for something whose entire job is to be unnoticed — and
         * the parent's CSS gradient is already painted underneath, so what a
         * reader sees while this arrives is the design that shipped before it.
         */
        <Suspense fallback={null}>
          <ShaderGradientCanvas
            pixelDensity={pixelRatio}
            pointerEvents="none"
            fov={isSwell ? 45 : 38}
            /*
             * The library's own viewport gate, on as well as ours.
             *
             * `useCanvasBudget` decides whether to mount at all; this decides
             * whether the mounted canvas draws. Belt and braces, and it costs
             * one observer.
             */
            lazyLoad
            style={{ position: 'absolute', inset: 0 }}
          >
            <ShaderGradient
              control="props"
              /*
               * `waterPlane` rather than the default `plane` or a `sphere`.
               *
               * A sphere is an object — it has an edge, and a section with a
               * ball behind the text is a section with a ball in it. The water
               * plane fills the frame with no silhouette at all, which is what
               * a background is: something with no shape of its own.
               */
              type="waterPlane"
              animate="on"
              /*
               * The palette, live.
               *
               * These are the skin's own tokens read out of the cascade — see
               * `useThemePalette` — so switching from Studio to Volcano moves
               * the shader with everything else. Three colours because that is
               * what the mesh takes: the accent, its soft twin, and the page's
               * own surface, which is what stops the wash reading as a coloured
               * rectangle laid over the design.
               */
              color1={palette.brand}
              color2={palette['brand-soft']}
              color3={palette.surface}
              /*
               * Slow. `uSpeed` is the single number most responsible for
               * whether this reads as atmosphere or as a screensaver, and the
               * library's own presets are tuned for a full-bleed hero on a
               * gallery site rather than for something behind a paragraph.
               */
              uSpeed={isSwell ? 0.14 : 0.08}
              uStrength={isSwell ? 2.4 : 1.6}
              uDensity={isSwell ? 1.4 : 1.1}
              uFrequency={isSwell ? 5.5 : 4.2}
              uAmplitude={0}
              positionX={0}
              positionY={0}
              positionZ={0}
              rotationX={isSwell ? 45 : 50}
              rotationY={0}
              rotationZ={isSwell ? 40 : 55}
              cAzimuthAngle={180}
              cPolarAngle={isSwell ? 82 : 90}
              cDistance={isSwell ? 3.4 : 2.8}
              cameraZoom={1}
              /*
               * `3d` rather than `env`, and this one is load-bearing rather
               * than aesthetic: the `env` path fetches a multi-megabyte `.hdr`
               * environment map over the network before it will render a frame.
               * `3d` is a single ambient light, which is all a flat unlit wash
               * has ever needed.
               */
              lightType="3d"
              brightness={1.1}
              /*
               * The grain is what keeps a wide gradient from banding.
               *
               * An eight-bit gradient across two thousand pixels has visible
               * steps on any panel worth having, and dithering is the standard
               * answer. It is also, incidentally, the thing that makes this
               * look like film rather than like CSS.
               */
              grain="on"
              grainBlending={0.12}
              zoomOut={false}
              toggleAxis={false}
              enableTransition={false}
            />
          </ShaderGradientCanvas>
        </Suspense>
      )}
    </div>
  );
};

export default ShaderWash;

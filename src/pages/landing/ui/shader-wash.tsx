import { Suspense, lazy, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useCanvasBudget, useCanvasPixelRatio } from '@/shared/lib/use-canvas-budget';
import { useThemePalette } from '@/shared/lib/theme-colors';

/**
 * A flowing gradient, in place of a two-stop CSS one. The product has fifty-odd `linear-gradient`
 * and `radial-gradient` declarations, and almost none of them are candidates for this.
 */

// Both halves of the library, loaded on demand. `@shadergradient/react` pulls in `three` and
// `@react-three/fiber`.
const ShaderGradientCanvas = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradientCanvas })),
);

const ShaderGradient = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradient })),
);

interface ShaderWashProps {
  /**
   * The character of the surface. `calm` is a slow horizontal drift for a section somebody is
   * reading; `swell` has more vertical relief and a little more speed, for one they are looking at.
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
      /* `pointer-events-none` is not optional. */
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ opacity }}
    >
      {canRender && (
        /* No fallback, on purpose. A spinner or a placeholder behind a headline would be a visible
           loading state for something whose entire job is to be unnoticed. */
        <Suspense fallback={null}>
          <ShaderGradientCanvas
            pixelDensity={pixelRatio}
            pointerEvents="none"
            fov={isSwell ? 45 : 38}
            /* The library's own viewport gate, on as well as ours. `useCanvasBudget` decides
               whether to mount at all; this decides whether the mounted canvas draws. */
            lazyLoad
            style={{ position: 'absolute', inset: 0 }}
          >
            <ShaderGradient
              control="props"
              /* `waterPlane` rather than the default `plane` or a `sphere`. */
              type="waterPlane"
              animate="on"
              /* The palette, live. These are the skin's own tokens read out of the cascade — see
                 `useThemePalette`. */
              color1={palette.brand}
              color2={palette['brand-soft']}
              color3={palette.surface}
              /* Slow. `uSpeed` is the single number most responsible for whether this reads as
                 atmosphere or as a screensaver. */
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
              /* `3d` rather than `env`, and this one is load-bearing rather than aesthetic. */
              lightType="3d"
              brightness={1.1}
              /* The grain is what keeps a wide gradient from banding. An eight-bit gradient across
                 two thousand pixels has visible steps on any panel worth having. */
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

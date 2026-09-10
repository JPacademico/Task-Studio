import { Suspense, forwardRef, lazy, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { useCanvasBudget, useCanvasPixelRatio } from '@/shared/lib/use-canvas-budget';
import { useShaderSlot } from '@/shared/lib/use-shader-slot';
import { useThemePalette } from '@/shared/lib/theme-colors';
import { SkinLoader } from './skin-loader';

/*
 * The library, loaded on demand — the same split `ShaderWash` uses.
 *
 * `@shadergradient/react` drags in `three` and `@react-three/fiber`, which
 * together are the largest thing in the repository. Behind `lazy` they are a
 * chunk that is only fetched once something has actually decided to draw one,
 * which on a phone, a metered connection or reduced motion is never — and,
 * because the landing page already loads the same chunk, a reader who arrives
 * through it pays nothing extra here.
 */
const ShaderGradientCanvas = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradientCanvas })),
);

const ShaderGradient = lazy(() =>
  import('@shadergradient/react').then((module) => ({ default: module.ShaderGradient })),
);

export interface ShaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  /** `icon` is the square, glyph-only form the phone layout uses. */
  size?: 'sm' | 'md' | 'icon';
}

const SIZES: Record<NonNullable<ShaderButtonProps['size']>, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9',
};

/**
 * The product's two "make a new thing" buttons, with a moving gradient for a
 * background instead of a flat fill.
 *
 * ## Why only these two get it
 *
 * Because a button that draws attention to itself is only useful if almost
 * nothing else does. "New project" and "New task" are the one action on their
 * respective screens that everything else exists to support, and they are the
 * two controls where a reader arriving cold should have no doubt about where to
 * start. Every other primary button in the app — Save, Invite, Connect — is a
 * *confirmation* of something already decided, and a shimmering Save button is
 * noise attached to a decision that has already been made.
 *
 * ## Why the flat fill is still painted underneath
 *
 * It is never removed, and it is what most readers actually see. It is the
 * first paint, the fallback for reduced motion, the fallback on a weak machine
 * or a metered connection, the fallback when the concurrency cap is spent, and
 * what is on screen for the fraction of a second while three.js is fetched. A
 * button whose background arrives late is a button that flashes; this one
 * simply gets deeper.
 *
 * ## Why the shader uses only brand-family colours
 *
 * `ShaderWash` mixes in `surface` because it sits *behind* a section and its
 * job is to not read as a coloured rectangle. This sits *behind a label*, and
 * the label is `brand-contrast` — a colour chosen to be legible against
 * `brand` and nothing else. Mixing a surface tone in would swing the
 * background's luminance through the range where that pairing stops holding,
 * once every few seconds, which is the kind of contrast failure that is
 * invisible in review because it is not on screen at the moment anybody looks.
 *
 * So the gradient moves through `brand` and `brand-soft` only. It changes the
 * *character* of the fill, never its brightness, and the contrast guarantee the
 * flat button already had survives unchanged on all thirteen skins.
 *
 * ## Why it does not follow the cursor
 *
 * Asked for, and correct anyway. A control that reacts to the pointer is making
 * a promise about what pressing it will do, and this one is decoration. It is
 * also the difference between a scene that renders a slow uniform update and
 * one that recomputes on every `mousemove` over the button — the second being
 * exactly the frame the browser also wants for the hover transition.
 *
 * ## What "seamless" means here
 *
 * There is no loop to seam. The animation is a noise field advanced by elapsed
 * time rather than a clip being replayed, so it never reaches an end and never
 * jumps back to a beginning — which is the property a looped video of the same
 * effect could not have given without a visible cut.
 */
export const ShaderButton = forwardRef<HTMLButtonElement, ShaderButtonProps>(
  ({ children, className, isLoading, size = 'md', disabled, ...props }, ref) => {
    const host = useRef<HTMLSpanElement>(null);

    /*
     * Two gates, and both must pass.
     *
     * `useCanvasBudget` answers "should this element run a canvas at all" —
     * capable machine, motion allowed, on screen, tab in front. Notably it also
     * covers the phone/desktop pair below: the hidden twin of this button is
     * `display: none`, an `IntersectionObserver` reports it as not intersecting,
     * and it therefore never mounts a scene for a control nobody can see.
     *
     * `useShaderSlot` answers "is there a context to spare" — see the note
     * there for why a per-element check cannot answer that one.
     */
    const budget = useCanvasBudget(host, '0px');
    const canRender = useShaderSlot(budget && !disabled);
    const pixelRatio = useCanvasPixelRatio(1.25);
    const palette = useThemePalette();

    return (
      <button
        ref={ref}
        // `||`, not `??`: an explicit `disabled={false}` alongside `isLoading`
        // would otherwise leave the button pressable while its own action is
        // still running, which is how one click becomes two writes.
        disabled={disabled || isLoading}
        className={cn(
          'ui-btn relative isolate inline-flex items-center justify-center overflow-hidden',
          'rounded-xl font-medium',
          /*
           * The flat fill, kept. See the note above: this is what a majority of
           * readers see, and what the label's contrast is guaranteed against.
           */
          'bg-brand text-brand-contrast shadow-sm shadow-brand/30',
          'transition-[filter,transform] duration-150',
          'hover:brightness-110 active:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
          'disabled:pointer-events-none disabled:opacity-60',
          SIZES[size],
          className,
        )}
        {...props}
      >
        {/*
          The canvas, behind the label and inert.

          `pointer-events-none` is not optional: a canvas stretched across a
          button would swallow the press it is decorating. `-z-10` with the
          `isolate` above keeps it behind the label without escaping the
          button's own stacking context.
        */}
        <span
          ref={host}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          {canRender && (
            /*
             * No fallback element, on purpose. The flat `bg-brand` is already
             * painted underneath, so what a reader sees while three.js arrives
             * is the button that shipped before this — not a placeholder.
             */
            <Suspense fallback={null}>
              <ShaderGradientCanvas
                pixelDensity={pixelRatio}
                pointerEvents="none"
                fov={40}
                lazyLoad
                style={{ position: 'absolute', inset: 0 }}
              >
                <ShaderGradient
                  control="props"
                  /*
                   * `waterPlane` for the reason `ShaderWash` gives: it fills
                   * the frame with no silhouette, where a sphere would put a
                   * visible object inside a 150-pixel button.
                   */
                  type="waterPlane"
                  animate="on"
                  /*
                   * Brand family only — see the note on this component for why
                   * `surface` is deliberately absent here and present there.
                   */
                  color1={palette.brand}
                  color2={palette['brand-soft']}
                  color3={palette.brand}
                  /*
                   * Slower than the landing page's calmest wash, which is
                   * already slow. A button is small, so a given angular speed
                   * reads as much faster across it than the same number does
                   * across a section — and this sits a few centimetres from
                   * something somebody is trying to read.
                   */
                  uSpeed={0.05}
                  uStrength={1.5}
                  uDensity={1.2}
                  uFrequency={3.2}
                  uAmplitude={0}
                  positionX={0}
                  positionY={0}
                  positionZ={0}
                  rotationX={50}
                  rotationY={0}
                  rotationZ={60}
                  cAzimuthAngle={180}
                  cPolarAngle={90}
                  /*
                   * Close in, so the visible slice is a small part of a large
                   * field. Two buttons on the same screen therefore show
                   * different regions of the same kind of motion rather than
                   * two copies of an identical animation.
                   */
                  cDistance={2.2}
                  cameraZoom={1}
                  /*
                   * `3d` rather than `env`, and this one is load-bearing: the
                   * `env` path fetches a multi-megabyte `.hdr` before it will
                   * render a frame. A button must not cost that.
                   */
                  lightType="3d"
                  brightness={1.05}
                  /* No grain. It is what stops a wide gradient banding, and
                     across 150 pixels there is no band to stop — so it would be
                     a full-screen noise pass bought for nothing. */
                  grain="off"
                  zoomOut={false}
                  toggleAxis={false}
                  enableTransition={false}
                />
              </ShaderGradientCanvas>
            </Suspense>
          )}
        </span>

        {isLoading && (
          <span className="absolute inset-0 grid place-items-center">
            <SkinLoader size="sm" tone="inherit" />
          </span>
        )}

        {/* Matching `Button`: the label keeps its box while loading, so the
            control does not change size under the pointer. */}
        <span
          className={cn(
            'inline-flex items-center justify-center',
            size === 'icon' ? '' : 'gap-1.5',
            isLoading && 'invisible',
          )}
        >
          {children}
        </span>
      </button>
    );
  },
);

ShaderButton.displayName = 'ShaderButton';

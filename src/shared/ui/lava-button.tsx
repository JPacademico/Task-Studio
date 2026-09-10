import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { LavaSurface } from './lava-surface';
import { SkinLoader } from './skin-loader';

export interface LavaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  /** `icon` is the square, glyph-only form the phone layout uses. */
  size?: 'sm' | 'md' | 'icon';
}

const SIZES: Record<NonNullable<LavaButtonProps['size']>, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9',
};

/**
 * The product's two "make a new thing" buttons, drawn as a lava lamp.
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
 * The landing page's calls to action are the third case and use `LavaLink`,
 * which is this with an anchor inside it.
 *
 * ## Why the flat accent fill is gone
 *
 * It was the whole complaint about the version before this one: the button was
 * still, unmistakably, a blue rectangle, and the effect on top of it moved
 * through colours a few percent apart. The tube is now three quarters of the
 * way from the accent to the far side of the label and the wax is the accent
 * itself — see `--lava-body` — so the moving part is the *brightest* thing on
 * the control rather than a variation on its background.
 *
 * The accent is not lost; it is what the button becomes when you point at it.
 * Hover sweeps a disc of full `--brand` out from the middle in 240ms and stops
 * the lamp behind it, which is both the requested behaviour and the cheapest
 * possible answer to "is this expensive while I am using it".
 *
 * ## What this used to be
 *
 * A `@shadergradient/react` scene: three.js, a WebGL context and a lazily
 * fetched chunk larger than everything else in the repository, mounted per
 * button behind a concurrency permit because a browser only hands out so many
 * contexts. What all of that bought was a water plane — a ripple travelling
 * across a surface, which across 150 pixels of button reads as a faint shimmer
 * on a flat fill. Seven empty spans and two keyframes do the thing it was
 * supposed to do, on a phone, with no network request.
 */
export const LavaButton = forwardRef<HTMLButtonElement, LavaButtonProps>(
  ({ children, className, isLoading, size = 'md', disabled, ...props }, ref) => (
    <button
      ref={ref}
      // `||`, not `??`: an explicit `disabled={false}` alongside `isLoading`
      // would otherwise leave the button pressable while its own action is
      // still running, which is how one click becomes two writes.
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        /*
         * `ui-lava` carries the tube, the label colour, the edge and the hover
         * fill — see `index.css`. Deliberately no `bg-*` or `shadow-*` utility
         * beside it: either would outrank the component layer and paint a flat
         * colour over the lamp or drop the hairline that makes the button's
         * boundary visible on a dark page.
         */
        'ui-btn ui-lava inline-flex items-center justify-center rounded-xl font-medium',
        'transition-transform duration-150 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        'disabled:pointer-events-none disabled:opacity-60',
        SIZES[size],
        className,
      )}
      {...props}
    >
      <LavaSurface />

      {isLoading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <SkinLoader size="sm" tone="inherit" />
        </span>
      )}

      {/* Matching `Button`: the label keeps its box while loading, so the
          control does not change size under the pointer. */}
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          size === 'icon' ? '' : 'gap-1.5',
          isLoading && 'invisible',
        )}
      >
        {children}
      </span>
    </button>
  ),
);

LavaButton.displayName = 'LavaButton';

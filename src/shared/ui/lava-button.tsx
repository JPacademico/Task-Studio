import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
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
 * The product's two "make a new thing" buttons, with a moving fill instead of
 * a flat one.
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
 * The landing page's calls to action are the third case, and they use the same
 * fill through `buttonClasses({ variant: 'lava' })` — they are anchors rather
 * than buttons, so they cannot be this component, and they should not have to
 * be. See `.ui-lava` for why the fill is a class rather than a subtree.
 *
 * ## What this used to be, and why it is not that any more
 *
 * A `@shadergradient/react` scene: three.js, a WebGL context and a lazily
 * fetched chunk larger than everything else in the repository, mounted per
 * button behind a concurrency permit because a browser only hands out so many
 * contexts before it starts discarding the oldest.
 *
 * What all of that bought was a *water plane* — a ripple that travels across a
 * surface rather than through it. Across a 150-pixel button that reads as a
 * faint shimmer over a flat fill, which is not what a moving fill is for, and
 * it had to be painted on top of `bg-brand` anyway because the shader arrived
 * late and did not cover reduced motion, weak machines or metered connections.
 * So the flat blue button was what most readers actually saw, with a
 * multi-megabyte download attached to it.
 *
 * `.ui-lava` is three gradients and two keyframes. It has no load state to
 * fall back from, no context to ration, runs on the compositor on a phone, and
 * the motion is blobs rising and falling through each other — which is the
 * thing a lamp does and a ripple does not.
 *
 * ## Why the flat fill is gone rather than kept underneath
 *
 * It was the fallback for a scene that might never arrive. Nothing arrives now:
 * the first paint is the lava, on every device, at every connection speed. A
 * flat `bg-brand` underneath would only be a colour that could never be seen —
 * except through the gradients, where it would flatten them.
 *
 * ## Why the colours are safe on all thirteen skins
 *
 * The label is `--brand-contrast`, which each skin picks to be legible against
 * `--brand` and nothing else — so a fill that wanders away from `--brand` is a
 * contrast guarantee that stops holding for a few seconds at a time. Every
 * colour the lamp moves through is the accent bent towards one of the skin's
 * own semantic hues and then pushed a few percent *away* from the label; the
 * weakest pairing that produces, across all thirteen skins in both palettes, is
 * 4.5:1 — better than the 3.9:1 the flat button managed on its worst skin. The
 * arithmetic is set out on `--lava-deep` in `index.css`.
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
         * `ui-lava` carries the fill, the label colour and the blob layers —
         * see `index.css`. Deliberately no `bg-*` utility beside it: a Tailwind
         * background would outrank the component layer and paint a flat colour
         * over the lamp.
         */
        'ui-btn ui-lava inline-flex items-center justify-center rounded-xl font-medium',
        'shadow-sm shadow-brand/30',
        'transition-[filter,transform] duration-150',
        'hover:brightness-[1.06] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        'disabled:pointer-events-none disabled:opacity-60',
        SIZES[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
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
  ),
);

LavaButton.displayName = 'LavaButton';

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
 * The product's "make a new thing" buttons, drawn as a lava lamp. "New project" in the top bar,
 * "New task" on a project board, and "New task" on the personal agenda.
 */
export const LavaButton = forwardRef<HTMLButtonElement, LavaButtonProps>(
  ({ children, className, isLoading, size = 'md', disabled, ...props }, ref) => (
    <button
      ref={ref}
      // `||`, not `??`: an explicit `disabled={false}` alongside `isLoading` would otherwise leave
      // the button pressable while its own action is still running.
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        /* `ui-lava` carries the tube, the label colour, the edge and the hover fill — see
           `index.css`. */
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

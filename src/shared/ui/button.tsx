import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';
import { SkinLoader } from './skin-loader';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-contrast hover:brightness-110 active:brightness-95 shadow-sm shadow-brand/30',
  secondary: 'bg-surface-sunken text-content hover:bg-edge/60',
  ghost: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  outline: 'border border-edge text-content hover:border-brand hover:text-brand',
  danger: 'bg-danger text-white hover:brightness-110',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9',
};

/**
 * The gap lives on the label row, not on the button.
 *
 * The label is one element now (see below), so a `gap` on the button itself
 * would have nothing to space. It is the icon and the word *inside* the label
 * that need separating.
 */
const GAPS: Record<Size, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
  icon: 'gap-1.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        // `ui-btn` is the skin hook: weight, tracking, casing, material and
        // press travel all come from the active theme rather than from here.
        // Deliberately no `font-medium` — a utility would outrank the skin's
        // `--btn-weight` and every theme would end up with the same 500.
        'ui-btn relative inline-flex select-none items-center justify-center rounded-xl',
        // 150ms is the sweet spot: perceptible but never in the way.
        'transition-[transform,background-color,color,box-shadow] duration-150 ease-studio',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {/*
        Waiting replaces the label; it does not push it aside.

        The spinner used to be *prepended* to the children, so a button grew by
        the width of a loader the moment it was pressed — the row it sat in
        reflowed, and on a footer of two buttons the other one jumped sideways.
        A control that changes size under the pointer reads as a glitch, and it
        is one: the button says the same thing before and after, so its box
        should not move.

        So the label keeps its space and only stops being painted
        (`invisible` is `visibility: hidden` — laid out, not drawn), and the
        loader is centred over it in the space the label reserved. The width is
        whatever the longest of the two happens to be, which is nearly always
        the label, and it does not change.

        Pending state is the skin's too — a generic spinner inside a brass
        plate or an arcade tile was the one un-themed pixel left on screen.
      */}
      {isLoading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <SkinLoader size="sm" tone="inherit" />
        </span>
      )}

      <span
        className={cn('inline-flex items-center justify-center', GAPS[size], isLoading && 'invisible')}
      >
        {children}
      </span>
    </button>
  ),
);

Button.displayName = 'Button';

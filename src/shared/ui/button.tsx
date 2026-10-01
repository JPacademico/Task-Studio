import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';
import { LavaSurface } from './lava-surface';
import { SkinLoader } from './skin-loader';

type Variant = 'primary' | 'lava' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-contrast hover:brightness-110 active:brightness-95 shadow-sm shadow-brand/30',
  // The same button, with a moving fill instead of a flat one.
  lava: 'ui-lava',
  // `ui-btn--secondary` is a skin hook, not a look — nothing in this file reads it. The studio
  // palette keeps `--edge` within a couple of steps of `--surface-sunken`.
  secondary: 'ui-btn--secondary bg-surface-sunken text-content hover:bg-edge/60',
  ghost: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  outline: 'border border-edge text-content hover:border-brand hover:text-brand',
  danger: 'bg-danger text-white hover:brightness-110',
};

/**
 * The three text sizes, and why none of them sets a fixed height any more. `h-10` is not "forty
 * pixels tall"; it is "forty pixels tall *whatever is inside it*".
 */
const SIZES: Record<Size, string> = {
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-2.5 text-base',
  icon: 'h-9 w-9',
};

/**
 * The gap lives on the label row, not on the button. The label is one element now (see below), so a
 * `gap` on the button itself would have nothing to space.
 */
const GAPS: Record<Size, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
  icon: 'gap-1.5',
};

/** Everything that makes a button look like one, without being one. */
export const buttonClasses = ({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}): string =>
  cn(
    // `ui-btn` is the skin hook: weight, tracking, casing, material and press travel all come from
    // the active theme rather than from here.
    'ui-btn relative inline-flex select-none items-center justify-center rounded-xl',
    // 150ms is the sweet spot: perceptible but never in the way.
    'transition-[transform,background-color,color,box-shadow] duration-150 ease-studio',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {/* The wax, for the one variant that has a tube to put it in. Rendered here rather than
          left to the call site, which is what it used to be. */}
      {variant === 'lava' && <LavaSurface />}

      {/* Waiting replaces the label; it does not push it aside. The spinner used to be
          *prepended* to the children. */}
      {isLoading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <SkinLoader size="sm" tone="inherit" />
        </span>
      )}

      {/* `relative` so the label stacks above the lamp rather than under it —
          the surface is absolutely positioned inside the same button. */}
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          GAPS[size],
          isLoading && 'invisible',
        )}
      >
        {children}
      </span>
    </button>
  ),
);

Button.displayName = 'Button';

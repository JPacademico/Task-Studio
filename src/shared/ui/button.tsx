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
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-9 w-9',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        // `ui-btn` is the skin hook: weight, tracking, casing, material and
        // press travel all come from the active theme rather than from here.
        // Deliberately no `font-medium` — a utility would outrank the skin's
        // `--btn-weight` and every theme would end up with the same 500.
        'ui-btn inline-flex select-none items-center justify-center rounded-xl',
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
      {/* Pending state is the skin's too — a generic spinner inside a brass
          plate or an arcade tile was the one un-themed pixel left on screen. */}
      {isLoading && <SkinLoader size="sm" tone="inherit" className="shrink-0" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

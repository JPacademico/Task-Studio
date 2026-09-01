import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Minus, Plus } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import { useSkinMotion } from '@/shared/lib/skin-motion';
import { useT } from '@/shared/i18n';
import { SkinLoader, skinLoaderWantsCaption } from './skin-loader';

/** Inline "working on it", for buttons and rows. Drawn in the active skin. */
export const Spinner = ({ className }: { className?: string }) => (
  <SkinLoader size="sm" className={className} />
);

export const PageLoader = ({ label = 'Loading' }: { label?: string }) => {
  const skin = useSkin();

  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3">
      <SkinLoader label={label} />
      {skinLoaderWantsCaption(skin) && (
        <p className="text-xs uppercase tracking-[0.18em] text-content-faint">{label}</p>
      )}
    </div>
  );
};

/**
 * A placeholder block.
 *
 * The sheen is a `::after` declared in CSS rather than a second element here:
 * a dashboard renders a dozen of these at once, and halving the node count of
 * the thing you show *because* the page is not ready yet is the cheap win.
 * Each skin restyles the fill and the sweep — see `.skeleton` in index.css.
 */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton', className)} />
);

interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: string;
  /** Hover text. A badge is often a summary of something worth spelling out. */
  title?: string;
}

export const Badge = ({ children, className, dot, title }: BadgeProps) => (
  <span
    title={title}
    className={cn(
      'ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-sunken',
      'px-2 py-0.5 text-[11px] font-medium text-content-muted',
      className,
    )}
  >
    {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
    {children}
  </span>
);

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-edge',
      'px-6 py-14 text-center',
      className,
    )}
  >
    {icon && <div className="text-content-faint">{icon}</div>}
    <div className="space-y-1">
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-content-muted">
          {description}
        </p>
      )}
    </div>
    {action}
  </div>
);

interface SectionProps {
  /**
   * `ReactNode`, not `string`, so a heading can carry a counter or a badge
   * beside its words without the caller having to rebuild the whole header.
   */
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Section = ({ title, description, action, children, className }: SectionProps) => (
  <section className={cn('space-y-3', className)}>
    <header className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-xs text-content-muted">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  options: readonly string[];
  label?: string;
}

export const ColorPicker = ({ value, onChange, options, label }: ColorPickerProps) => {
  const t = useT();

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-content-muted">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={t('common.useColour', { color })}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
            className={cn(
              'h-7 w-7 rounded-full transition-transform duration-150 ease-studio',
              'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
              value.toLowerCase() === color.toLowerCase()
                ? 'ring-2 ring-content ring-offset-2 ring-offset-surface-raised'
                : 'ring-1 ring-black/10',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
};

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  /** Applied to the row, so a compact surface can set its own type scale. */
  className?: string;
}

/**
 * A two-state toggle.
 *
 * ## Why the knob is a flex child and not an absolute one
 *
 * It used to be `absolute top-0.5` inside a `relative` track, with no `left` —
 * so its horizontal origin was its *static position*, which is a function of
 * the button's own box model rather than of anything stated here. Under a skin
 * that gives buttons padding, or a browser that resolves the static position of
 * an out-of-flow first child differently, the knob drifts out of its track and
 * lands on whatever is beside it. That is exactly what it did on the repository
 * import panel: a white circle sitting on top of the label, over text nobody
 * could then read.
 *
 * As a flex child with `items-center` there is no static position to resolve:
 * the knob is laid out inside the track, centred vertically by the container,
 * and the only thing left for `translate-x` to express is the travel. The
 * geometry is then arithmetic anybody can check — 36px track, 16px knob, 2px of
 * clearance at either end.
 *
 * ## Why the label does not set its own size
 *
 * It did, at `text-sm`, and every caller that put one of these on a compact
 * surface got a control shouting one size larger than the panel around it.
 * `className` on the row means the *surface* decides, which is where that
 * decision belongs — the switch's job is the track and the knob.
 */
export const Switch = ({ checked, onChange, label, id, className }: SwitchProps) => (
  <label
    htmlFor={id}
    className={cn('flex cursor-pointer items-center gap-2.5 text-sm', className)}
  >
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        checked ? 'bg-brand' : 'bg-edge',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-studio',
          checked ? 'translate-x-[1.125rem]' : 'translate-x-[0.125rem]',
        )}
      />
    </button>
    {label && <span className="text-content-muted">{label}</span>}
  </label>
);

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Rendered after the number — "px", "pt"… */
  suffix?: string;
  className?: string;
}

/**
 * A number with an explicit − and + on either side.
 *
 * A bare range slider gives no clue which way is "more"; two signed buttons
 * read instantly and are far easier to hit on a phone than a 4px track.
 */
export const Stepper = ({
  value,
  onChange,
  min = 1,
  max = 24,
  step = 1,
  label,
  suffix,
  className,
}: StepperProps) => {
  const t = useT();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-xs text-content-muted">{label}</span>}

      <div className="inline-flex items-center rounded-xl border border-edge bg-surface-sunken">
        <button
          type="button"
          aria-label={t('common.decrease', { label: label ?? t('common.value') })}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="grid h-7 w-7 place-items-center rounded-xl rounded-r-none text-content-muted transition-colors hover:bg-edge/50 hover:text-content disabled:opacity-35"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>

        <span className="min-w-9 text-center text-xs font-semibold tabular-nums">
          {value}
          {suffix}
        </span>

        <button
          type="button"
          aria-label={t('common.increase', { label: label ?? t('common.value') })}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="grid h-7 w-7 place-items-center rounded-xl rounded-l-none text-content-muted transition-colors hover:bg-edge/50 hover:text-content disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
};

interface CollapsibleProps {
  title: string;
  /** Count shown next to the title, e.g. how many rows are inside. */
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * An accordion drawn in the design system rather than in browser defaults: the
 * trigger is a full-width surface that lights up on hover, the marker is the
 * app's own chevron with a spring rotation, and the body reveals by height so
 * the rows below settle instead of jumping.
 */
export const Collapsible = ({
  title,
  badge,
  defaultOpen = true,
  children,
  className,
}: CollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // The reveal curve belongs to the skin, not to this component.
  const motionSpec = useSkinMotion();

  return (
    <section className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className={cn(
          'ui-accordion group relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          isOpen
            ? 'border-brand/30 bg-brand/[0.07]'
            : 'border-edge bg-surface-raised hover:border-brand/30 hover:bg-surface-sunken/60',
        )}
      >
        <motion.span
          aria-hidden
          initial={false}
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={motionSpec.marker}
          className={cn(
            'grid h-5 w-5 shrink-0 place-items-center rounded-md transition-colors duration-150',
            isOpen ? 'bg-brand/15 text-brand' : 'text-content-faint group-hover:text-content',
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.8} />
        </motion.span>

        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {badge}
        <span className="h-px flex-1 bg-edge/70" />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={motionSpec.reveal}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

/**
 * Horizontal segmented control (My Tasks / Team / All, status filters…).
 *
 * ## Why the buttons say `aria-pressed` and not `role="tab"`
 *
 * Because half the places this is used are not tabs. It is a view switcher on
 * the meetings panel, a scope filter on the task list, and a genuine tab row on
 * the project page — and `role="tab"` is a promise about the *rest* of the
 * markup: a `tablist` container, a `tabpanel` with a matching id, and arrow-key
 * navigation between the buttons. Declaring the role without those is worse
 * than declaring nothing, because a screen reader then announces "tab 3 of 12"
 * and the arrow keys it tells the user to press do nothing.
 *
 * `aria-pressed` is true of every use: this is a group of buttons, one of which
 * is currently on. It is what makes the selected option audible at all — before
 * it, the state was carried entirely by a background colour.
 */
interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
  /** Names the group for assistive technology. "Filter", "View", "Section". */
  label?: string;
}

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  className,
  label,
}: SegmentedProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      'ui-segment inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1',
      className,
    )}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        aria-pressed={value === option.value}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
          'transition-colors duration-150',
          /*
           * A focus ring, because there was none.
           *
           * These are bespoke `<button>`s rather than the shared `Button`, so
           * they fell through to whatever the browser draws — which on `pixel`
           * and `newspaper`, both of which square every corner in the product,
           * is a rounded halo that reads as a rendering fault. Matched to
           * `buttonClasses` so the whole app keeps one focus language.
           */
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
          value === option.value
            ? // The inset ring is what makes the selected segment legible on the
              // skins whose `--surface-raised` and `--surface-sunken` are a few
              // percent apart and whose `shadow-sm` resolves to nothing.
              'bg-surface-raised text-content shadow-sm ring-1 ring-inset ring-edge'
            : 'text-content-muted hover:text-content',
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

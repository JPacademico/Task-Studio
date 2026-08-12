import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Second line in the list — what picking this actually does. */
  hint?: string;
  icon?: ReactNode;
  /** Small colour chip, for palettes and status lists. */
  swatch?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  /** Shown on the trigger before the current value ("Status: To do"). */
  prefix?: string;
  className?: string;
  /** Matches the height of the filter row's inputs. */
  size?: 'sm' | 'md';
}

/**
 * The app's dropdown.
 *
 * A native `<select>` is drawn by the OS: it ignores the skin, the radius
 * tokens and the type scale, so every filter row had one grey rectangle that
 * belonged to a different application. This is a listbox that lives in the
 * design system — same border, same radius token, same motion curve as the
 * panels around it — with the keyboard behaviour the native control gives for
 * free written back in.
 */
export const Select = <T extends string>({
  value,
  options,
  onChange,
  label,
  prefix,
  className,
  size = 'sm',
}: SelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value) ?? options[0];

  // Close on an outside click or Escape — the two things a native popup does.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const commit = (next: T) => {
    onChange(next);
    setIsOpen(false);
  };

  const handleTriggerKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((current) => {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        return (current + step + options.length) % options.length;
      });
      return;
    }

    if (isOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && <p className="mb-1.5 text-xs font-medium text-content-muted">{label}</p>}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onClick={() => {
          setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleTriggerKey}
        className={cn(
          // Tight on purpose: a filter row also has to hold the layout switcher
          // on the same line, and in the skins that run a wide face every spare
          // pixel of padding here is what pushed the switcher onto its own row.
          'ui-filter group inline-flex w-full items-center gap-1.5 rounded-xl border bg-surface px-2.5 text-left',
          'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm',
          isOpen ? 'border-brand text-content' : 'border-edge text-content-muted hover:text-content',
        )}
      >
        {selected?.swatch && (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: selected.swatch }}
          />
        )}
        {selected?.icon}

        <span className="min-w-0 flex-1 truncate">
          {prefix && <span className="text-content-faint">{prefix} </span>}
          <span className="font-medium text-content">{selected?.label}</span>
        </span>

        <motion.span
          aria-hidden
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 text-content-faint group-hover:text-content"
        >
          <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'panel absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-full max-w-[16rem] origin-top',
              'scrollbar-thin max-h-72 overflow-y-auto p-1.5',
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;

              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(option.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                      'transition-colors duration-100',
                      index === activeIndex && 'bg-surface-sunken',
                      isSelected ? 'text-brand' : 'text-content',
                    )}
                  >
                    {option.swatch && (
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: option.swatch }}
                      />
                    )}
                    {option.icon}

                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate', isSelected && 'font-semibold')}>
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="block truncate text-[10px] text-content-faint">
                          {option.hint}
                        </span>
                      )}
                    </span>

                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

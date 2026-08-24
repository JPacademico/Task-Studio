import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

/** Where the popup sits, in viewport coordinates. */
interface PopupBox {
  left: number;
  top: number;
  width: number;
  /** Space available below the trigger, so the list can cap itself. */
  maxHeight: number;
  /** Set when the list had to open upwards, which flips its origin. */
  isAbove: boolean;
}

/** Breathing room between the trigger and the list, and off the viewport edge. */
const GAP = 6;
const MARGIN = 8;
/** The list never grows past this, however much room there is. */
const MAX_LIST_HEIGHT = 288;

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<PopupBox | null>(null);
  const listId = useId();

  /**
   * Where to put the list, measured from the trigger every time it opens.
   *
   * Recomputed rather than remembered because the trigger moves: a filter row
   * reflows, a modal body scrolls, the window resizes. The numbers are viewport
   * coordinates, which is what `position: fixed` wants.
   */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - MARGIN;
    const above = rect.top - GAP - MARGIN;

    /*
     * Open upwards only when there is genuinely more room up there *and* down
     * here is too cramped to be useful. Flipping on the first pixel of
     * shortfall makes a list near the middle of the screen jump sides as the
     * page scrolls under it.
     */
    const isAbove = below < 160 && above > below;
    const maxHeight = Math.min(MAX_LIST_HEIGHT, Math.max(120, isAbove ? above : below));

    setBox({
      left: rect.left,
      top: isAbove ? rect.top - GAP : rect.bottom + GAP,
      width: rect.width,
      maxHeight,
      isAbove,
    });
  }, []);

  const selected = options.find((option) => option.value === value) ?? options[0];

  // Measured before paint, so the list never renders one frame in the wrong
  // place — which on a portal reads as the popup flying in from the corner.
  useLayoutEffect(() => {
    if (isOpen) measure();
  }, [isOpen, measure]);

  // Close on an outside click or Escape — the two things a native popup does.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      /*
       * The popup is no longer a descendant of the container.
       *
       * It is portalled to `document.body` (see below), so the old
       * `container.contains(target)` test now calls a click *on an option* an
       * outside click — which closed the list on pointerdown, before the
       * option's own click handler ever ran. That is precisely the "the role
       * picker does nothing" bug this fixes, so both nodes are checked.
       */
      if (containerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    /*
     * Scroll listened for in the capture phase so a scrolling *ancestor* —
     * a modal body, a rail — is heard, not just the window. A popup pinned to
     * viewport coordinates has to follow its trigger or it detaches from it.
     */
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, measure]);

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
        ref={triggerRef}
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

      {/*
        The list is portalled to the body, and that is a bug fix rather than a
        refactor.

        It used to be `absolute` inside this container. That works on a filter
        row and fails completely inside a dialog: the modal clips its panel
        (`overflow-hidden`) and scrolls its body (`overflow-y-auto`), so a
        listbox opening near the bottom of a form was cut off at the body's
        edge — which is why the role picker in the "new organization" dialog
        appeared to do nothing when clicked. Any `overflow` on any ancestor is
        enough to do it, so the fix cannot be a `z-index`: the popup has to
        leave the subtree.

        `position: fixed` at measured viewport coordinates is what replaces it,
        with the trigger re-measured on scroll and resize so the two stay
        together. See `measure`.
      */}
      {createPortal(
        <AnimatePresence>
          {isOpen && box && (
            <motion.ul
              ref={popupRef}
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: box.isAbove ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: box.isAbove ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                left: box.left,
                top: box.isAbove ? undefined : box.top,
                bottom: box.isAbove ? window.innerHeight - box.top : undefined,
                minWidth: box.width,
                maxHeight: box.maxHeight,
                transformOrigin: box.isAbove ? 'bottom center' : 'top center',
              }}
              className={cn(
                // `z-[60]` clears the modal's own layer: this now sits beside
                // the dialog in the DOM rather than inside it, so it has to
                // outrank it explicitly.
                'panel z-[60] max-w-[16rem]',
                'scrollbar-thin overflow-y-auto p-1.5',
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
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

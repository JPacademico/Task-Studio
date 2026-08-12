import { AnimatePresence, motion } from 'framer-motion';
import { Group, Link2, MousePointerClick, Ungroup, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import type { Rect } from '../lib/use-board-gestures';

interface SelectionBarProps {
  count: number;
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  onClear: () => void;
}

/**
 * The selection bar, floating over the board instead of hiding in the toolbar.
 *
 * Grouping used to live in the top strip, far from the notes it acted on and
 * only reachable after discovering Ctrl+click. Here it appears where the work
 * is, the moment there is a selection, and says what it will do.
 */
export const SelectionBar = ({
  count,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  onClear,
}: SelectionBarProps) => (
  <AnimatePresence>
    {count > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={cn(
          'panel pointer-events-auto absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center',
          'gap-2 px-2.5 py-2 shadow-panel',
        )}
      >
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-contrast">
          {count}
        </span>
        <span className="hidden text-xs text-content-muted sm:inline">
          {count === 1 ? 'note selected' : 'notes selected'}
        </span>

        <span className="mx-1 h-5 w-px bg-edge" />

        <Button
          size="sm"
          onClick={onGroup}
          disabled={!canGroup}
          title={
            canGroup
              ? 'Bind these into one unit — dragging any member moves them all'
              : 'Select at least two notes to group them'
          }
        >
          <Group className="h-3.5 w-3.5" />
          Group
        </Button>

        {canUngroup && (
          <Button size="sm" variant="secondary" onClick={onUngroup}>
            <Ungroup className="h-3.5 w-3.5" />
            Ungroup
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={onClear} aria-label="Clear selection">
          <X className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    )}
  </AnimatePresence>
);

interface ConnectBannerProps {
  /** Null while the user still has to pick where the arrow starts. */
  sourceLabel: string | null;
  isActive: boolean;
  onCancel: () => void;
}

/** Two dots and a live caption: which half of the gesture the user is in. */
export const ConnectBanner = ({ sourceLabel, isActive, onCancel }: ConnectBannerProps) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="panel pointer-events-auto absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 px-3 py-2"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
          <Link2 className="h-3.5 w-3.5" />
        </span>

        {/* Step dots — the arrow needs two ends and this says which one is next. */}
        <span aria-hidden className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              sourceLabel ? 'bg-positive' : 'animate-pin-pulse bg-brand',
            )}
          />
          <span className="h-px w-4 bg-edge" />
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              sourceLabel ? 'animate-pin-pulse bg-brand' : 'bg-edge',
            )}
          />
        </span>

        <span className="text-xs">
          {sourceLabel ? (
            <>
              <span className="font-semibold">Now click where the arrow lands.</span>{' '}
              <span className="text-content-muted">From “{sourceLabel}”.</span>
            </>
          ) : (
            <>
              <span className="font-semibold">Click the note the arrow starts from.</span>{' '}
              <span className="hidden text-content-muted sm:inline">
                Click an existing arrow to remove it.
              </span>
            </>
          )}
        </span>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Leave connect mode"
          className="rounded-lg p-1 text-content-faint transition-colors hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);

/** The rubber band itself. */
export const MarqueeBox = ({ rect }: { rect: Rect | null }) =>
  rect ? (
    <div
      aria-hidden
      className="pointer-events-none absolute z-30 rounded-md border-2 border-brand/70 bg-brand/10"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    />
  ) : null;

/** Shown once, over an empty board, to name the gesture nobody guesses. */
export const LassoHint = ({ show }: { show: boolean }) =>
  show ? (
    <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-raised/80 px-3 py-1 text-[11px] text-content-faint backdrop-blur">
      <MousePointerClick className="h-3 w-3" />
      Drag across the board to select several notes at once
    </p>
  ) : null;

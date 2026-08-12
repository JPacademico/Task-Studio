import { memo, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, type MotionValue } from 'framer-motion';
import { Check, Link2, Palette, Pin, Trash2, Zap } from 'lucide-react';

import { NOTE_COLORS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { readableInk, withAlpha } from '@/shared/lib/colors';
import type { Note, UpdateNotePayload } from '../model/types';
import { NoteAuthorStamp } from './note-author';

export interface NoteHandle {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

/*
 * Every callback below takes the note's id as its first argument rather than
 * closing over it at the call site. That is what lets a board hand down one
 * `useCallback` per action for the whole wall instead of a fresh arrow
 * function per note per render — and it is the difference between the memo on
 * this component holding and being dead weight. A board in connect mode
 * re-renders on every animation frame to move the draft connector; with stable
 * handlers, none of the notes re-render with it.
 */
interface PostItProps {
  note: Note;
  onChange: (id: string, payload: UpdateNotePayload) => void;
  onDragEnd: (id: string, position: { positionX: number; positionY: number }) => void;
  onDelete: (id: string) => void;
  onFocus?: (id: string) => void;
  /** Drag bounds — the board element. */
  constraintsRef?: React.RefObject<HTMLElement | null>;

  // --- Board integration (unused by the simple task/project note lists) ------
  /** Publishes this note's motion values so the board can move a group as one. */
  onRegister?: (id: string, handle: NoteHandle | null) => void;
  /** Live pointer feedback for the connector layer, per animation frame. */
  onDragMove?: (id: string, x: number, y: number) => void;
  /** Group drag: the board applies the same delta to every other member. */
  onGroupDrag?: (id: string, deltaX: number, deltaY: number) => void;
  isSelected?: boolean;
  /** Connect mode swallows clicks and turns the whole card into a target. */
  isConnectTarget?: boolean;
  isConnectSource?: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  /**
   * Board is in a mode where a plain click adds to the selection — the
   * checkbox is then permanently visible instead of appearing on hover.
   */
  isPickingMultiple?: boolean;
  /** Tint for the note's group, so members read as one unit at a glance. */
  groupTint?: string;
  /** A note somebody else wrote on a shared board can be moved, not binned. */
  canDelete?: boolean;
  /** Signed-in user, so the attribution stamp can say "You" rather than a name. */
  currentUserId?: string;
  /**
   * Whether to stamp the note with who wrote it.
   *
   * On by default, and off on the personal board: that desk has exactly one
   * author, so an avatar on every sheet says nothing and costs a node, an
   * image request and a corner of the paper on all of them.
   */
  showAuthor?: boolean;
}

/**
 * The Post-it: a real physical-feeling object, not a styled div.
 *
 * - `drag` runs on a motion value, so dragging never re-renders React.
 * - The paper is tilted with `rotate` and lifts on grab (scale + shadow).
 * - A folded corner is drawn with a clip-path triangle instead of an image.
 *
 * An IMAGE note is the same object with a photograph pinned to it instead of
 * handwriting, so it keeps the tilt, the lift and the folded corner.
 */
const PostItBase = ({
  note,
  onChange,
  onDragEnd,
  onDelete,
  onFocus,
  constraintsRef,
  onRegister,
  onDragMove,
  onGroupDrag,
  isSelected,
  isConnectTarget,
  isConnectSource,
  onSelect,
  isPickingMultiple,
  groupTint,
  canDelete = true,
  currentUserId,
  showAuthor = true,
}: PostItProps) => {
  const x = useMotionValue(note.positionX);
  const y = useMotionValue(note.positionY);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastDragRef = useRef({ x: note.positionX, y: note.positionY });

  // Keep the local draft in sync when the note changes from a realtime event.
  useEffect(() => setDraft(note.content), [note.content]);

  // A position that changed elsewhere (group drag, page switch) has to land on
  // the motion values, which React never touches on its own.
  useEffect(() => {
    x.set(note.positionX);
    y.set(note.positionY);
    lastDragRef.current = { x: note.positionX, y: note.positionY };
  }, [note.positionX, note.positionY, x, y]);

  useEffect(() => {
    onRegister?.(note.id, { x, y });
    return () => onRegister?.(note.id, null);
  }, [note.id, onRegister, x, y]);

  const ink = readableInk(note.color);
  const isImage = note.kind === 'IMAGE';

  // While wiring notes together, a click must not also nudge the card: the
  // gesture is "point at this one", not "pick it up".
  const isConnecting = Boolean(isConnectTarget || isConnectSource);
  const isSelectable = Boolean(onSelect) && !isConnecting;
  const showCheckbox = isSelectable && (isPickingMultiple || isSelected);

  return (
    <motion.div
      drag={!isConnecting}
      dragMomentum={false}
      dragElastic={0.04}
      dragConstraints={constraintsRef as React.RefObject<Element>}
      style={{
        x,
        y,
        rotate: note.rotation,
        width: note.width,
        minHeight: isImage ? undefined : note.height,
        backgroundColor: isImage ? '#ffffff' : note.color,
        color: ink,
        zIndex: note.zIndex,
      }}
      whileDrag={{ scale: 1.04, rotate: 0, zIndex: 999 }}
      whileHover={isConnectTarget ? { scale: 1.05, rotate: 0 } : { scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onPointerDown={(event) => {
        onFocus?.(note.id);
        onSelect?.(
          note.id,
          isPickingMultiple || event.shiftKey || event.ctrlKey || event.metaKey,
        );
      }}
      onDrag={() => {
        const next = { x: x.get(), y: y.get() };
        onDragMove?.(note.id, next.x, next.y);
        onGroupDrag?.(note.id, next.x - lastDragRef.current.x, next.y - lastDragRef.current.y);
        lastDragRef.current = next;
      }}
      onDragEnd={() => {
        lastDragRef.current = { x: x.get(), y: y.get() };
        onDragEnd(note.id, { positionX: x.get(), positionY: y.get() });
      }}
      className={cn(
        // The paper's radius, shadow and grain are the skin's to decide.
        //
        // Deliberately not `.gpu`: that class promotes the element to its own
        // compositor layer permanently, and a board can hold several hundred
        // sheets — which is hundreds of layers and their texture memory held
        // open for a page that is usually completely still. Framer Motion
        // promotes the one note actually being dragged, for the duration of
        // the drag, which is the behaviour that was wanted.
        'postit group/note absolute cursor-grab touch-none select-none active:cursor-grabbing',
        isImage ? 'p-2' : 'postit-grain p-3.5',
        isSelected && 'ring-2 ring-brand ring-offset-2 ring-offset-surface-sunken',
        isConnectSource && 'ring-2 ring-positive ring-offset-2 ring-offset-surface-sunken',
        isConnectTarget && 'cursor-crosshair',
      )}
    >
      {/* Folded corner. */}
      <span
        aria-hidden
        className="absolute right-0 top-0 h-6 w-6"
        style={{
          background: withAlpha('#000000', 0.12),
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        }}
      />

      {/* Group membership, drawn as a tinted border around the whole sheet. */}
      {groupTint && !isSelected && (
        <span
          aria-hidden
          title="Part of a group — dragging one moves them all"
          className="pointer-events-none absolute -inset-1 rounded-[7px] border-2 border-dashed"
          style={{ borderColor: groupTint }}
        />
      )}

      {/* Connect mode: the target is unmistakable — marching dashes, a plug
          icon and a caption, instead of a sentence of instructions above the
          board that nobody reads. */}
      {isConnectTarget && (
        <span
          aria-hidden
          className="marching pointer-events-none absolute inset-0 grid place-items-center rounded-[4px] ring-2 ring-inset ring-brand/60"
        >
          <span className="flex flex-col items-center gap-1 rounded-lg bg-brand px-2 py-1.5 text-brand-contrast shadow-lg">
            <Link2 className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Link here</span>
          </span>
        </span>
      )}

      {isConnectSource && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-positive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg"
        >
          <Zap className="mr-0.5 inline h-2.5 w-2.5" />
          From here
        </span>
      )}

      {/* Selection handle. A checkbox on the paper is what makes multi-select
          discoverable — the old flow needed the user to know about Ctrl+click. */}
      {showCheckbox && (
        <button
          type="button"
          aria-label={isSelected ? 'Deselect this note' : 'Select this note'}
          aria-pressed={isSelected}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(note.id, true);
          }}
          className={cn(
            'absolute -left-2 -top-2 z-20 grid h-6 w-6 place-items-center rounded-full border-2 shadow-md transition-transform hover:scale-110',
            isSelected
              ? 'border-brand bg-brand text-brand-contrast'
              : 'border-content/30 bg-white text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </button>
      )}

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <input
          value={note.title ?? ''}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
          placeholder={isImage ? 'Caption' : 'Title'}
          className={cn(
            'w-full bg-transparent text-sm font-bold outline-none placeholder:opacity-40',
            isImage ? 'font-sans text-xs' : 'font-hand',
          )}
          style={{ color: isImage ? undefined : ink }}
        />

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
            onClick={() => onChange(note.id, { isPinned: !note.isPinned })}
            className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
          >
            <Pin className={cn('h-3 w-3', note.isPinned && 'fill-current')} />
          </button>
          {!isImage && (
            <button
              type="button"
              aria-label="Change colour"
              onClick={() => setIsPaletteOpen((open) => !open)}
              className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
            >
              <Palette className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label="Delete note"
              onClick={() => onDelete(note.id)}
              className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isPaletteOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex flex-wrap gap-1.5"
        >
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              onClick={() => {
                onChange(note.id, { color });
                setIsPaletteOpen(false);
              }}
              className="h-5 w-5 rounded-full ring-1 ring-black/20 transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ))}
        </motion.div>
      )}

      {isImage ? (
        <img
          src={note.imageUrl ?? ''}
          alt={note.title ?? 'Board image'}
          draggable={false}
          // The board stores the box; the picture fits inside it.
          className="pointer-events-none block w-full rounded-[2px] object-cover"
          style={{ maxHeight: note.height }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // Commit on blur: one write per edit session instead of one per keypress.
          onBlur={() => draft !== note.content && onChange(note.id, { content: draft })}
          placeholder="Write something…"
          className="h-full min-h-[110px] w-full resize-none bg-transparent font-hand text-[15px] leading-relaxed outline-none placeholder:opacity-40"
          style={{ color: ink }}
        />
      )}

      {/* Traceability: whose handwriting this is, on the paper itself. */}
      {showAuthor && (
        <NoteAuthorStamp
          author={note.author}
          createdAt={note.createdAt}
          isMine={Boolean(currentUserId) && note.userId === currentUserId}
        />
      )}
    </motion.div>
  );
};

/**
 * Memoised: a board can hold a few hundred sheets, and every one of them owns
 * two motion values, a spring transition and a drag gesture. Without this, one
 * note moving re-rendered the whole wall — which is the single most expensive
 * thing that can happen on a canvas while the pointer is down.
 *
 * The boards already hand down stable callbacks (`useCallback`) and a `note`
 * object that only changes identity when the note itself does, which is what
 * makes the comparison hold.
 */
export const PostIt = memo(PostItBase);
PostIt.displayName = 'PostIt';

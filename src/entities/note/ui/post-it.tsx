import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import { Check, Expand, Link2, Palette, Pin, Trash2, Zap } from 'lucide-react';

import { NOTE_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { readableInk, withAlpha } from '@/shared/lib/colors';
import { useDebouncedCallback } from '@/shared/lib/hooks';
import { clampOnPaste, clampText } from '@/shared/lib/text';
import { ImageViewer } from '@/shared/ui/zoomable-image';
import type { Note, UpdateNotePayload } from '../model/types';
import { NoteAuthorStamp } from './note-author';
import { useT } from '@/shared/i18n';

export interface NoteHandle {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

/**
 * How long a pause counts as "finished typing". Two seconds, which is long enough to swallow a
 * whole sentence and short enough that a note is never more than a breath away from being saved.
 */
const COMMIT_DELAY_MS = 2_000;

/** The box a Post-it may be dragged to. These are the API's own bounds (`UpdateNoteDto`). */
const MIN_SIZE = 80;
const MAX_SIZE = 900;

/**
 * The sheet the type scale was designed around: a new note, at 220px square, holding 15px
 * handwriting inside 14px of padding.
 */
const BASE_SIZE = 220;
const BASE_FONT = 15;
const BASE_PAD = 14;

/** Type size for a sheet of a given size. */
const fontFor = (size: number): number =>
  Math.max(11, Math.min(24, BASE_FONT * Math.sqrt(size / BASE_SIZE)));

/**
 * The sheet's own spring, reused for the one animation it plays on its own: a refused grab settling
 * back where it came from.
 */
const SHEET_SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const;

/**
 * Padding for a sheet of a given size, on the same curve. 14px of margin is a comfortable border on
 * a 220px note and a quarter of the width of an 80px one.
 */
const padFor = (size: number): number =>
  Math.max(6, Math.min(BASE_PAD, (BASE_PAD * size) / BASE_SIZE));

// Every callback below takes the note's id as its first argument rather than closing over it at the
// call site.
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
   * Whether to stamp the note with who wrote it. On by default, and off on the personal board: that
   * desk has exactly one author, so an avatar on every sheet says nothing and costs a node.
   */
  showAuthor?: boolean;
  /**
   * Whether the sheet can be resized by its corner. On for the boards, off for the simple note
   * lists on a task or a project page.
   */
  canResize?: boolean;

  // --- Shared-board concurrency (project whiteboard only) -------------------
  /**
   * Somebody else is holding this sheet right now. Their name and their colour, or `null` when it
   * is free — see `useBoardPresence`.
   */
  heldBy?: { name: string; color: string } | null;
  /**
   * Asks for exclusive hold before a gesture begins, and gives it back after. Asynchronous because
   * the answer comes from the server, and the caller may say no.
   */
  onHold?: (id: string) => Promise<boolean>;
  onRelease?: (id: string) => void;
  /** Called on every frame of a local drag, so peers can watch it move. */
  onDragBroadcast?: (id: string, x: number, y: number) => void;
}

/** The Post-it: a real physical-feeling object, not a styled div. */
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
  canResize = false,
  heldBy = null,
  onHold,
  onRelease,
  onDragBroadcast,
}: PostItProps) => {
  const t = useT();
  const x = useMotionValue(note.positionX);
  const y = useMotionValue(note.positionY);
  // Size rides on motion values for the same reason position does: a resize is a pointer gesture,
  // and running it through React state would re-render the sheet — and its textarea.
  const width = useMotionValue(note.width);
  const height = useMotionValue(note.height);


  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  /** The picture on an IMAGE note, opened full-screen. See `openViewer`. */
  const [isViewing, setIsViewing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [titleDraft, setTitleDraft] = useState(note.title ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastDragRef = useRef({ x: note.positionX, y: note.positionY });
  /**
   * True between `onDragStart` and `onDragEnd`. A ref rather than state: it is read by an effect
   * and never rendered.
   */
  const isDraggingRef = useRef(false);

  // What this component has said and the server has not confirmed yet. A realtime `note:updated` is
  // the *last* thing the server knew.
  const dirtyRef = useRef({ title: false, content: false });

  /**
   * Whether *this* client currently holds the sheet, and whether the server has said so yet. `held`
   * goes true the instant the pointer goes down; `confirmed` only when the grant arrives.
   */
  const holdRef = useRef({ held: false, confirmed: false });

  /** The answer to the current gesture's hold request, for a drag that ends before it arrives. */
  const claimRef = useRef<Promise<boolean> | null>(null);

  /**
   * Set when the server refused this gesture; read by the drag handlers so a refused drag neither
   * moves anything else nor saves anything. Cleared by the next press.
   */
  const refusedRef = useRef(false);

  /**
   * Stops Framer moving the sheet for the rest of a refused press. State, because it has to reach
   * the `drag` prop: Framer reads that prop on every pointer move of a gesture already in progress.
   */
  const [isRefused, setIsRefused] = useState(false);
  const isPressedRef = useRef(false);
  const settleRef = useRef<AnimationPlaybackControls[]>([]);

  /** Where the sheet lives as far as the board knows. Read by async answers that outlive a render. */
  const homeRef = useRef({ x: note.positionX, y: note.positionY });
  homeRef.current = { x: note.positionX, y: note.positionY };

  // Read through refs, so the gesture handlers below can stay out of the dependency arrays that
  // keep this component's memo intact.
  const holdApi = useRef({ onHold, onRelease, onDragBroadcast, onDragMove, onGroupDrag });
  holdApi.current = { onHold, onRelease, onDragBroadcast, onDragMove, onGroupDrag };

  /** Whether dependants may follow this sheet: always on a board without holds. */
  const isConfirmed = () => !holdApi.current.onHold || holdRef.current.confirmed;

  /**
   * Tells everything that follows this sheet where it now is: the connector arrows, the rest of its
   * group, and the rest of the room.
   */
  const propagate = () => {
    const next = { x: x.get(), y: y.get() };
    const api = holdApi.current;
    api.onDragMove?.(note.id, next.x, next.y);
    api.onGroupDrag?.(note.id, next.x - lastDragRef.current.x, next.y - lastDragRef.current.y);
    // The same coordinates the connector layer gets, to the rest of the
    // room. Throttled by the board — see `publishDrag`.
    api.onDragBroadcast?.(note.id, next.x, next.y);
    lastDragRef.current = next;
  };
  const propagateRef = useRef(propagate);
  propagateRef.current = propagate;

  /**
   * A refused grab, undone gracefully. The sheet springs back to where the board says it lives
   * rather than being teleported there — the jump used to read as a glitch.
   */
  const refuse = () => {
    refusedRef.current = true;
    isDraggingRef.current = false;
    if (isPressedRef.current) setIsRefused(true);

    const home = homeRef.current;
    lastDragRef.current = home;
    for (const controls of settleRef.current) controls.stop();
    settleRef.current = [animate(x, home.x, SHEET_SPRING), animate(y, home.y, SHEET_SPRING)];
  };
  const refuseRef = useRef(refuse);
  refuseRef.current = refuse;

  /** Take hold, and undo the gesture if the answer is no. */
  const claim = useCallback(() => {
    const request = holdApi.current.onHold;
    if (!request || holdRef.current.held) return;

    holdRef.current = { held: true, confirmed: false };

    claimRef.current = request(note.id).then((granted) => {
      // Let go of before the answer came: nothing to confirm or undo.
      if (!holdRef.current.held) return granted;

      if (granted) {
        holdRef.current.confirmed = true;
        // A drag already under way catches its dependants up now, rather than on the next pointer
        // move — which never comes if the hand has paused.
        if (isDraggingRef.current) propagateRef.current();
        return true;
      }

      holdRef.current = { held: false, confirmed: false };
      refuseRef.current();
      return false;
    });
  }, [note.id]);

  // The end of a press, wherever the pointer happens to be when it lifts. On `window`, because a
  // drag routinely ends off the sheet.
  const endPress = useCallback(() => {
    window.removeEventListener('pointerup', endPress);
    window.removeEventListener('pointercancel', endPress);
    isPressedRef.current = false;
    setIsRefused(false);
  }, []);

  useEffect(
    () => () => {
      window.removeEventListener('pointerup', endPress);
      window.removeEventListener('pointercancel', endPress);
      for (const controls of settleRef.current) controls.stop();
    },
    [endPress],
  );

  /**
   * Whether the caret is in one of this sheet's two fields. Focus rather than `dirtyRef`, which was
   * the first thing tried and is wrong: `dirtyRef` only becomes true on the first *keystroke*.
   */
  const focusedRef = useRef(false);

  /**
   * Give the sheet back, unless it is still in use. The two ways a sheet is "in use" are a pointer
   * on it and a caret in it, and they overlap constantly.
   */
  const maybeRelease = useCallback(() => {
    if (!holdRef.current.held) return;
    if (isDraggingRef.current || focusedRef.current) return;

    holdRef.current = { held: false, confirmed: false };
    holdApi.current.onRelease?.(note.id);
  }, [note.id]);

  /** Unconditional, for the one case that overrides everything: unmounting. */
  const relinquish = useCallback(() => {
    if (!holdRef.current.held) return;
    holdRef.current = { held: false, confirmed: false };
    holdApi.current.onRelease?.(note.id);
  }, [note.id]);

  // A sheet that goes away while held has to let go of it. Switching board pages, collapsing the
  // full-screen stage.
  const relinquishRef = useRef(relinquish);
  relinquishRef.current = relinquish;
  useEffect(() => () => relinquishRef.current(), []);

  // The debounce's safety net. `useDebouncedCallback` cancels its pending timer on unmount, which
  // is right for a position write nobody will miss and wrong for a sentence somebody just typed.
  const pendingRef = useRef<UpdateNotePayload | null>(null);
  const flushRef = useRef<() => void>(() => {});

  const commit = useCallback(
    (payload: UpdateNotePayload) => {
      pendingRef.current = null;
      onChange(note.id, payload);
    },
    [note.id, onChange],
  );

  const commitDebounced = useDebouncedCallback(commit, COMMIT_DELAY_MS);

  /** Queues an edit for the pause, and for the unmount if that comes first. */
  const queue = useCallback(
    (payload: UpdateNotePayload) => {
      pendingRef.current = { ...pendingRef.current, ...payload };
      commitDebounced(payload);
    },
    [commitDebounced],
  );

  // Read through a ref so the flush effect can have an empty dependency list —
  // it must run on unmount only, never on every re-render of a live note.
  flushRef.current = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    onChange(note.id, pending);
  };

  useEffect(() => () => flushRef.current(), []);

  // Keep the local drafts in sync with the note — but never on top of an edit
  // in progress. See `dirtyRef`.
  useEffect(() => {
    if (!dirtyRef.current.content) setDraft(note.content);
  }, [note.content]);

  useEffect(() => {
    if (!dirtyRef.current.title) setTitleDraft(note.title ?? '');
  }, [note.title]);

  // A position that changed elsewhere (group drag, page switch, a teammate's socket echo) has to
  // land on the motion values, which React never touches on its own.
  useEffect(() => {
    if (isDraggingRef.current) return;

    x.set(note.positionX);
    y.set(note.positionY);
    lastDragRef.current = { x: note.positionX, y: note.positionY };

    // And the connector layer, which prefers a live override to the stored position whenever it has
    // one.
    holdApi.current.onDragMove?.(note.id, note.positionX, note.positionY);
  }, [note.id, note.positionX, note.positionY, x, y]);

  // Same guard as the position: a resize is a drag too, and an echo landing
  // mid-gesture would snap the corner back under the pointer.
  useEffect(() => {
    if (isDraggingRef.current) return;

    width.set(note.width);
    height.set(note.height);
  }, [height, note.height, note.width, width]);

  useEffect(() => {
    onRegister?.(note.id, { x, y });
    return () => onRegister?.(note.id, null);
  }, [note.id, onRegister, x, y]);

  const ink = readableInk(note.color);
  const isImage = note.kind === 'IMAGE';

  // The type scale, derived from the sheet and not from a render. This is the half that makes the
  // resize *dynamic*.
  const shortSide = useTransform([width, height], ([w, h]: number[]) =>
    isImage ? w : Math.min(w, h),
  );
  const fontSize = useTransform(shortSide, fontFor);
  // The title is the one line that is read first, so it stays a touch larger
  // than the body at every size rather than being scaled from a smaller base.
  const titleSize = useTransform(shortSide, (size: number) => fontFor(size) * 1.02);
  const padding = useTransform(shortSide, padFor);

  // While wiring notes together, a click must not also nudge the card: the
  // gesture is "point at this one", not "pick it up".
  const isConnecting = Boolean(isConnectTarget || isConnectSource);
  const isSelectable = Boolean(onSelect) && !isConnecting;
  const showCheckbox = isSelectable && (isPickingMultiple || isSelected);

  /** Where the last press on the picture began, in client pixels. */
  const picturePressRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Opens the picture the way a task's attachment opens: full-screen, zoomable. Refused whenever a
   * click on the sheet already means something else — the board is joining notes, picking several.
   */
  const openViewer = (event: React.MouseEvent) => {
    const press = picturePressRef.current;
    picturePressRef.current = null;
    if (!press || !note.imageUrl) return;

    const travel = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (travel > 4 || isDraggingRef.current) return;
    if (isConnecting || isPickingMultiple) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) return;

    setIsViewing(true);
  };

  // Corner drag, wired natively rather than through React. The handle previously used
  // `onPointerDown`, a React synthetic handler.
  const [resizeHandle, setResizeHandle] = useState<HTMLButtonElement | null>(null);

  // Mirrored into a ref because the resize listener is registered natively, once per note, and must
  // not be re-attached when a lock arrives — doing so mid-gesture drops the drag.
  const heldRef = useRef(heldBy);
  heldRef.current = heldBy;

  // Read through refs so the effect can register once per note rather than on
  // every render: re-attaching a listener mid-gesture would drop the drag.
  const resizeState = useRef({
    commit,
    width: note.width,
    height: note.height,
    rotation: note.rotation,
  });
  resizeState.current = {
    commit,
    width: note.width,
    height: note.height,
    rotation: note.rotation,
  };

  useEffect(() => {
    const handle = resizeHandle;
    if (!handle || !canResize) return;

    const clamp = (value: number) => Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, value)));

    const onPointerDown = (event: PointerEvent) => {
      // Primary button only: a right-click on the corner should open the menu,
      // not silently begin a resize the user cannot see they have started.
      if (event.button !== 0) return;
      // A sheet somebody else is holding cannot be resized, and this is the guard that matters most
      // of the three. A drag that is refused snaps back and nothing is lost.
      if (heldRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      handle.setPointerCapture(event.pointerId);
      // A resize is a gesture too, so it takes the same authority over the
      // sheet's geometry that a drag does — see the sync effects above.
      isDraggingRef.current = true;

      const origin = { x: event.clientX, y: event.clientY };
      const start = {
        width: width.get(),
        height: height.get(),
        x: x.get(),
        y: y.get(),
      };

      // Read once per gesture: the sheet's tilt cannot change while a pointer
      // is down on the corner, and trigonometry per frame is not free.
      const angle = (resizeState.current.rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      /** Where the sheet has to sit for its top-left corner not to have moved. */
      const anchor = (nextWidth: number, nextHeight: number) => {
        const halfW = (nextWidth - start.width) / 2;
        const halfH = (nextHeight - start.height) / 2;

        return {
          x: start.x - halfW * (1 - cos) - halfH * sin,
          y: start.y + halfW * sin - halfH * (1 - cos),
        };
      };

      // A photograph is scaled; a written sheet is reshaped. Both are the same object with the same
      // handle.
      const aspect = start.height / (start.width || 1);

      const move = (moveEvent: PointerEvent) => {
        const nextWidth = clamp(start.width + (moveEvent.clientX - origin.x));
        const nextHeight = isImage
          ? clamp(Math.round(nextWidth * aspect))
          : clamp(start.height + (moveEvent.clientY - origin.y));

        width.set(nextWidth);
        height.set(nextHeight);

        // Same frame as the size, on the same motion values the drag uses — so
        // the corner under the pointer is the only corner that moves.
        const placed = anchor(nextWidth, nextHeight);
        x.set(placed.x);
        y.set(placed.y);
      };

      const finish = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        isDraggingRef.current = false;

        const next = {
          width: width.get(),
          height: height.get(),
          positionX: x.get(),
          positionY: y.get(),
        };

        const saved = resizeState.current;
        if (next.width === saved.width && next.height === saved.height) return;

        // A drag that follows has to measure its delta from where the sheet
        // actually is, not from where it was before the corner moved it.
        lastDragRef.current = { x: next.positionX, y: next.positionY };

        // Straight through, not debounced: the gesture has ended, so there is nothing left to
        // coalesce and no reason to make the user wait for it.
        saved.commit(next);
      };

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
    };

    // `passive: false` because this handler calls `preventDefault`. Chrome treats `pointerdown` on
    // a touch-capable device as passive by default.
    handle.addEventListener('pointerdown', onPointerDown, { passive: false });
    return () => handle.removeEventListener('pointerdown', onPointerDown);
  }, [canResize, height, isImage, resizeHandle, width, x, y]);

  return (
    <>
    <motion.div
      // Held by somebody else: no drag, at the gesture level rather than by cancelling one that has
      // begun.
      drag={!isConnecting && !heldBy && !isRefused}
      dragMomentum={false}
      dragElastic={0.04}
      dragConstraints={constraintsRef as React.RefObject<Element>}
      style={{
        x,
        y,
        rotate: note.rotation,
        width,
        // A written sheet is the box it was drawn as, so the corner handle has
        // something to change; an image keeps its own aspect and grows down.
        ...(isImage ? {} : { height, padding }),
        backgroundColor: isImage ? '#ffffff' : note.color,
        color: ink,
        zIndex: note.zIndex,
        // Read by `.postit--held::after`. One property rather than a class per
        // colleague — see `peer-color.ts` for why there are twelve of them.
        ...(heldBy ? ({ '--board-hold-ink': heldBy.color } as React.CSSProperties) : {}),
      }}
      whileDrag={{ scale: 1.04, rotate: 0, zIndex: 999 }}
      // No lift on a sheet that cannot be picked up. A hover response is a promise that something
      // will happen on click, and on a held note nothing will.
      whileHover={
        heldBy ? undefined : isConnectTarget ? { scale: 1.05, rotate: 0 } : { scale: 1.015 }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onPointerDown={(event) => {
        // Nothing at all on a sheet somebody else has: not a selection, not a
        // z-index bump, not a colour picker. The whole object is theirs.
        if (heldBy) return;

        // A new press: whatever the last one was refused, this one has not been.
        refusedRef.current = false;
        isPressedRef.current = true;
        window.addEventListener('pointerup', endPress);
        window.addEventListener('pointercancel', endPress);

        claim();
        onFocus?.(note.id);
        onSelect?.(
          note.id,
          isPickingMultiple || event.shiftKey || event.ctrlKey || event.metaKey,
        );
      }}
      /* A click that never became a drag still took hold, and has to give it back — this is the
         exit `onDragEnd` does not cover. */
      onPointerUp={maybeRelease}
      onPointerCancel={maybeRelease}
      onDragStart={() => {
        if (refusedRef.current) return;
        isDraggingRef.current = true;
        // A settle still running from an earlier refusal would fight the hand.
        for (const controls of settleRef.current) controls.stop();
        settleRef.current = [];
      }}
      onDrag={() => {
        // Only the sheet moves until the hold is confirmed. Its group, its arrows and the rest of
        // the room wait for the grant — a few tens of milliseconds.
        if (refusedRef.current || !isConfirmed()) return;
        propagate();
      }}
      onDragEnd={() => {
        // Refused: `refuse` has already sent it home, and there is nothing to save.
        if (refusedRef.current) return;

        const finish = () => {
          isDraggingRef.current = false;
          // Anything the confirmed drag has not yet told its dependants.
          propagateRef.current();
          lastDragRef.current = { x: x.get(), y: y.get() };
          // `note.id` is read at call time, so a sheet whose placeholder id was swapped for the
          // server's mid-drag persists under the *real* id — the element survived the swap.
          onDragEnd(note.id, { positionX: x.get(), positionY: y.get() });

          // Let go *after* the position has been handed to the board, never before.
          maybeRelease();
        };

        if (isConfirmed()) {
          finish();
          return;
        }

        // A flick that ended before the answer arrived. Nothing is saved until the server has said
        // yes — saving first is the last-write-wins race again, arrived at by being quick.
        void claimRef.current?.then((granted) => {
          if (granted && !refusedRef.current) finish();
        });
      }}
      className={cn(
        // The paper's radius, shadow and grain are the skin's to decide. Deliberately not `.gpu`:
        // that class promotes the element to its own compositor layer permanently.
        'postit group/note absolute flex flex-col cursor-grab touch-none select-none active:cursor-grabbing',
        // A written sheet's padding is a motion value (it shrinks with the sheet); an image's is
        // fixed, because the picture inside it is what carries the size.
        isImage ? 'p-2' : 'postit-grain',
        isSelected && 'ring-2 ring-brand ring-offset-2 ring-offset-surface-sunken',
        isConnectSource && 'ring-2 ring-positive ring-offset-2 ring-offset-surface-sunken',
        isConnectTarget && 'cursor-crosshair',
        // The dashed ring in the holder's own colour — see `.postit--held`.
        heldBy && 'postit--held',
      )}
    >
      {/* Who has it. Above the sheet rather than on it, in the same position the connect mode's
          "from here" chip uses. */}
      {heldBy && (
        <span
          className={cn(
            'pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2',
            'max-w-[90%] truncate whitespace-nowrap rounded-full px-2 py-0.5',
            'text-3xs font-bold uppercase tracking-wide text-white shadow-lg',
          )}
          style={{ backgroundColor: heldBy.color }}
        >
          {heldBy.name}
        </span>
      )}

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
          title={t('notes.partOfGroup')}
          className="pointer-events-none absolute -inset-1 rounded-[7px] border-2 border-dashed"
          style={{ borderColor: groupTint }}
        />
      )}

      {/* Connect mode: the target is unmistakable — marching dashes, a plug icon and a caption,
          instead of a sentence of instructions above the board that nobody reads. */}
      {isConnectTarget && (
        <span
          aria-hidden
          className="marching pointer-events-none absolute inset-0 grid place-items-center rounded-[4px] ring-2 ring-inset ring-brand/60"
        >
          <span className="flex flex-col items-center gap-1 rounded-lg bg-brand px-2 py-1.5 text-brand-contrast shadow-lg">
            <Link2 className="h-4 w-4" />
            <span className="text-3xs font-bold uppercase tracking-wide">{t('notes.linkHere')}</span>
          </span>
        </span>
      )}

      {isConnectSource && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-positive px-2 py-0.5 text-3xs font-bold uppercase tracking-wide text-white shadow-lg"
        >
          <Zap className="mr-0.5 inline h-2.5 w-2.5" />
          {t('notes.fromHere')}
        </span>
      )}

      {/* Selection handle. A checkbox on the paper is what makes multi-select
          discoverable — the old flow needed the user to know about Ctrl+click. */}
      {showCheckbox && (
        <button
          type="button"
          aria-label={t(isSelected ? 'notes.deselectNote' : 'notes.selectNote')}
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

      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
        <motion.input
          /* Read-only rather than disabled while somebody else has the sheet. A disabled input is
             not focusable, is skipped by a screen reader's form navigation. */
          readOnly={Boolean(heldBy)}
          value={titleDraft}
          /* Focus is a hold, and this is the second half of the guarantee. */
          onFocus={() => {
            focusedRef.current = true;
            claim();
          }}
          onChange={(event) => {
            const next = clampText(event.target.value, TEXT_LIMITS.noteTitle);
            dirtyRef.current.title = true;
            setTitleDraft(next);
            queue({ title: next });
          }}
          onBlur={() => {
            dirtyRef.current.title = false;
            focusedRef.current = false;
            if (titleDraft !== (note.title ?? '')) commit({ title: titleDraft });
            // On the next task, not this one. Tabbing from the title to the body is a blur
            // immediately followed by a focus.
            queueMicrotask(maybeRelease);
          }}
          // Explicit, rather than relying on `maxlength` alone: the attribute silently swallows the
          // tail of an over-long paste mid-word.
          onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.noteTitle)}
          placeholder={t(isImage ? 'notes.imageCaption' : 'notes.noteTitle')}
          maxLength={TEXT_LIMITS.noteTitle}
          className={cn(
            'w-full bg-transparent font-bold outline-none placeholder:opacity-40',
            isImage ? 'font-sans text-xs' : 'font-hand',
          )}
          style={{
            color: isImage ? undefined : ink,
            // An image's caption keeps its fixed `text-xs`: it is a label on a picture rather than
            // writing on a sheet, and it sits under a box whose height the reader does not control.
            ...(isImage ? {} : { fontSize: titleSize }),
          }}
        />

        {/* Every control on the sheet goes with the sheet. Pinning, recolouring and deleting
            are all writes to the same row the holder is editing. */}
        <div className={cn('flex shrink-0 items-center gap-0.5', heldBy && 'hidden')}>
          <button
            type="button"
            aria-label={t(note.isPinned ? 'notes.unpinNote' : 'notes.pinNote')}
            onClick={() => commit({ isPinned: !note.isPinned })}
            className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
          >
            <Pin className={cn('h-3 w-3', note.isPinned && 'fill-current')} />
          </button>
          {!isImage && (
            <button
              type="button"
              aria-label={t('notes.changeColour')}
              onClick={() => setIsPaletteOpen((open) => !open)}
              className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
            >
              <Palette className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label={t('notes.deleteNote')}
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
          className="mb-2 flex shrink-0 flex-wrap gap-1.5"
        >
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t('notes.useColour', { color })}
              onClick={() => {
                commit({ color });
                setIsPaletteOpen(false);
              }}
              className="h-5 w-5 rounded-full ring-1 ring-black/20 transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ))}
        </motion.div>
      )}

      {isImage ? (
        /* The picture, and the click that opens it. A wrapper rather than the `<img>` itself,
           because the image stays `pointer-events-none`. */
        <div
          className="group/picture relative"
          onPointerDown={(event) => {
            picturePressRef.current = { x: event.clientX, y: event.clientY };
          }}
          onClick={openViewer}
        >
          <motion.img
            src={note.imageUrl ?? ''}
            alt={note.title ?? t('notes.boardImage')}
            draggable={false}
            // Decoded off the main thread and fetched only once it is worth fetching: a board can
            // pin dozens of photographs.
            loading="lazy"
            decoding="async"
            // The board stores the box; the picture fits inside it. `motion.img` rather than a
            // plain one so the corner handle's live height — a motion value.
            className="pointer-events-none block w-full rounded-[2px] object-cover"
            style={{ maxHeight: height }}
          />

          {/*
            The same corner affordance a task's attachment shows, for the same
            reason: a picture that opens on click should say so before it is
            clicked. A button of its own, so keyboard users have a way in too;
            it swallows the press so reaching for it never starts a drag.
          */}
          {note.imageUrl && (
            <button
              type="button"
              aria-label={t('image.expand')}
              title={t('image.expand')}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setIsViewing(true);
              }}
              className={cn(
                'absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full',
                'bg-black/55 text-white opacity-0 transition-opacity duration-150',
                'focus-visible:opacity-100 group-hover/picture:opacity-100',
                '[@media(pointer:coarse)]:opacity-70',
              )}
            >
              <Expand className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <motion.textarea
          ref={textareaRef}
          readOnly={Boolean(heldBy)}
          value={draft}
          // See the title field: focus takes the hold, blur gives it back.
          onFocus={() => {
            focusedRef.current = true;
            claim();
          }}
          onChange={(event) => {
            const next = clampText(event.target.value, TEXT_LIMITS.noteContent);
            dirtyRef.current.content = true;
            setDraft(next);
            queue({ content: next });
          }}
          // Blur commits immediately rather than waiting out the pause: leaving
          // the field is a clearer "done" than any timer.
          onBlur={() => {
            dirtyRef.current.content = false;
            focusedRef.current = false;
            if (draft !== note.content) commit({ content: draft });
            // Deferred, so tabbing back to the title does not let go in the
            // gap between the two events. See the title field.
            queueMicrotask(maybeRelease);
          }}
          onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.noteContent)}
          placeholder={t('notes.writeSomething')}
          maxLength={TEXT_LIMITS.noteContent}
          /* `overflow-auto` stays, and is now the floor rather than the behaviour. The type scales
             with the sheet, so the common case — a note holding what a note holds — fits. */
          className="min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent font-hand leading-relaxed outline-none placeholder:opacity-40"
          style={{ color: ink, fontSize }}
        />
      )}

      {/* How much room is left, shown only when it is nearly gone. The limit is 2,000
          characters and it is enforced three ways already — `clampText`. */}
      {!isImage && draft.length > TEXT_LIMITS.noteContent * 0.9 && (
        <span
          aria-live="polite"
          className="pointer-events-none absolute bottom-1 left-2 text-4xs font-semibold tabular-nums opacity-60"
          style={{ color: ink }}
        >
          {TEXT_LIMITS.noteContent - draft.length}
        </span>
      )}

      {/* Traceability: whose handwriting this is, on the paper itself. */}
      {showAuthor && (
        <NoteAuthorStamp
          author={note.author}
          createdAt={note.createdAt}
          isMine={Boolean(currentUserId) && note.userId === currentUserId}
        />
      )}

      {/* The corner handle. Bottom-right, drawn as two short rules the way every resizable pane
          on the desktop draws one, and permanently visible on a coarse pointer. */}
      {canResize && !heldBy && (
        <button
          ref={setResizeHandle}
          type="button"
          aria-label={t('notes.resizeNote')}
          title={t('notes.resizeNote')}
          // The gesture itself is registered natively — see the effect above. This only stops the
          // click that follows the drag from reaching the note underneath and selecting it.
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'absolute -bottom-1 -right-1 z-20 h-5 w-5 cursor-nwse-resize touch-none rounded-sm',
            'opacity-0 transition-opacity focus-visible:opacity-100 group-hover/note:opacity-70',
            'hover:!opacity-100 [@media(pointer:coarse)]:opacity-60',
          )}
        >
          <span
            aria-hidden
            className="absolute bottom-1.5 right-1.5 block h-2.5 w-0.5 rounded-full"
            style={{ background: withAlpha(ink, 0.55) }}
          />
          <span
            aria-hidden
            className="absolute bottom-1.5 right-1.5 block h-0.5 w-2.5 rounded-full"
            style={{ background: withAlpha(ink, 0.55) }}
          />
        </button>
      )}
    </motion.div>

    {/* A sibling of the sheet, not a child of it. */}
    {isImage && note.imageUrl && (
      <ImageViewer
        src={note.imageUrl}
        alt={note.title?.trim() || t('notes.boardImage')}
        isOpen={isViewing}
        onClose={() => setIsViewing(false)}
      />
    )}
    </>
  );
};

/**
 * Memoised: a board can hold a few hundred sheets, and every one of them owns two motion values, a
 * spring transition and a drag gesture.
 */
export const PostIt = memo(PostItBase);
PostIt.displayName = 'PostIt';

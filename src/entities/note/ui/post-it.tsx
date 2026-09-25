import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import { Check, Link2, Palette, Pin, Trash2, Zap } from 'lucide-react';

import { NOTE_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { readableInk, withAlpha } from '@/shared/lib/colors';
import { useDebouncedCallback } from '@/shared/lib/hooks';
import { clampOnPaste, clampText } from '@/shared/lib/text';
import type { Note, UpdateNotePayload } from '../model/types';
import { NoteAuthorStamp } from './note-author';
import { useT } from '@/shared/i18n';

export interface NoteHandle {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

/**
 * How long a pause counts as "finished typing".
 *
 * Two seconds, which is long enough to swallow a whole sentence and short
 * enough that a note is never more than a breath away from being saved.
 */
const COMMIT_DELAY_MS = 2_000;

/**
 * The box a Post-it may be dragged to.
 *
 * These are the API's own bounds (`UpdateNoteDto`), repeated here so the handle
 * stops at the edge instead of letting the drag run on and the request come
 * back 400. Anything clamped on the client is validated again on the server —
 * this is an affordance, not the rule.
 */
const MIN_SIZE = 80;
const MAX_SIZE = 900;

/**
 * The sheet the type scale was designed around: a new note, at 220px square,
 * holding 15px handwriting inside 14px of padding.
 *
 * Everything below is expressed as a ratio against these three numbers rather
 * than as a table of sizes, so a note at any width between `MIN_SIZE` and
 * `MAX_SIZE` gets type that belongs to it.
 */
const BASE_SIZE = 220;
const BASE_FONT = 15;
const BASE_PAD = 14;

/**
 * Type size for a sheet of a given size.
 *
 * ## Why the text scales at all
 *
 * Because the sheet is paper and the words are written on it. Before this, the
 * type was fixed at 15px whatever the note measured, which failed at both ends
 * of the handle: dragging a note down to 80px left a line and a half of text
 * behind an inner scrollbar — the reader's own sentence, hidden inside a note
 * small enough to read at a glance — and dragging one out to 600px produced a
 * poster with a caption on it. Neither is a sheet of paper. Resizing a Post-it
 * should feel like choosing a bigger sheet, and writing on a bigger sheet is
 * bigger.
 *
 * ## Why the square root
 *
 * A linear scale is what the metaphor suggests and it is wrong in practice:
 * 15px at 220 becomes 61px at 900, which is a headline, and 5px at 80, which
 * is unreadable. Square root keeps the direction of the change — bigger sheet,
 * bigger writing — while compressing both ends, so a note four times the area
 * carries twice the type. The clamps then cap what is left: never smaller than
 * 11px, which is the floor for the handwriting face at a glance, and never
 * larger than 24px, past which a note holds one sentence.
 *
 * ## Why the smaller dimension decides
 *
 * A note dragged wide and short has room across and none down. Scaling on
 * width would fill it with type too tall for the two lines it can show, which
 * is the same overflow this exists to prevent, arrived at from the other side.
 */
const fontFor = (size: number): number =>
  Math.max(11, Math.min(24, BASE_FONT * Math.sqrt(size / BASE_SIZE)));

/**
 * The sheet's own spring, reused for the one animation it plays on its own: a
 * refused grab settling back where it came from. Same numbers as the lift, so
 * the sheet moves like the same object whichever way it is going.
 */
const SHEET_SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const;

/**
 * Padding for a sheet of a given size, on the same curve.
 *
 * 14px of margin is a comfortable border on a 220px note and a quarter of the
 * width of an 80px one — which is how a small note ended up with more margin
 * than text. Linear here rather than square root, because margin is the thing
 * that should give way first: the words are what the note is for.
 */
const padFor = (size: number): number =>
  Math.max(6, Math.min(BASE_PAD, (BASE_PAD * size) / BASE_SIZE));

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
  /**
   * Whether the sheet can be resized by its corner.
   *
   * On for the boards, off for the simple note lists on a task or a project
   * page, where a Post-it is laid out by the list rather than placed by hand.
   */
  canResize?: boolean;

  // --- Shared-board concurrency (project whiteboard only) -------------------
  /**
   * Somebody else is holding this sheet right now.
   *
   * Their name and their colour, or `null` when it is free — see
   * `useBoardPresence`. A held sheet cannot be dragged, resized, typed in or
   * recoloured by anybody but its holder, which is the whole of the guarantee:
   * you cannot pick up a piece of paper somebody else has their hand on.
   *
   * Deliberately not a boolean. The name is what makes the refusal make sense
   * — a sheet that simply stopped responding would read as a bug — and the
   * colour is what ties it to the pointer moving it about.
   */
  heldBy?: { name: string; color: string } | null;
  /**
   * Asks for exclusive hold before a gesture begins, and gives it back after.
   *
   * Asynchronous because the answer comes from the server, and the caller may
   * say no. The sheet starts moving optimistically and is put back if it does
   * — see `onPointerDown` below for why that is better than freezing every
   * drag for a round trip.
   */
  onHold?: (id: string) => Promise<boolean>;
  onRelease?: (id: string) => void;
  /** Called on every frame of a local drag, so peers can watch it move. */
  onDragBroadcast?: (id: string, x: number, y: number) => void;
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
 *
 * ## Typing
 *
 * Both text fields are local drafts committed on a pause, and that is the whole
 * fix for what used to make this thing unusable. The title was a *controlled*
 * input bound straight to `note.title`, writing through to the API on every
 * keystroke — so on the project whiteboard each character produced a PATCH, the
 * server broadcast `note:updated` back to the very person typing, and the
 * echo — one or two characters behind by the time it arrived — was written into
 * the cache and re-rendered into the input under the cursor. That is what the
 * random-looking letter changes were: the field being rewound to a server copy
 * of a word that had moved on. Holding the draft locally means the input is
 * never rewound mid-word, and the debounce means the round trip happens once
 * per edit instead of once per key.
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
  canResize = false,
  heldBy = null,
  onHold,
  onRelease,
  onDragBroadcast,
}: PostItProps) => {
  const t = useT();
  const x = useMotionValue(note.positionX);
  const y = useMotionValue(note.positionY);
  // Size rides on motion values for the same reason position does: a resize is
  // a pointer gesture, and running it through React state would re-render the
  // sheet — and its textarea — on every frame of the drag.
  const width = useMotionValue(note.width);
  const height = useMotionValue(note.height);


  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [titleDraft, setTitleDraft] = useState(note.title ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastDragRef = useRef({ x: note.positionX, y: note.positionY });
  /**
   * True between `onDragStart` and `onDragEnd`.
   *
   * A ref rather than state: it is read by an effect and never rendered, and
   * making it state would re-render the sheet twice per gesture for a value
   * nothing draws. See the position-sync effect below for what it guards.
   */
  const isDraggingRef = useRef(false);

  /*
   * What this component has said and the server has not confirmed yet.
   *
   * A realtime `note:updated` is the *last* thing the server knew, which during
   * an edit is by definition older than what is on screen. Accepting it would
   * undo the characters typed since — so a field with an uncommitted draft
   * ignores incoming values for that field and keeps its own.
   */
  const dirtyRef = useRef({ title: false, content: false });

  /**
   * Whether *this* client currently holds the sheet, and whether the server
   * has said so yet.
   *
   * `held` goes true the instant the pointer goes down; `confirmed` only when
   * the grant arrives. The gap between them is the optimistic window — see
   * `claim` — and the two are what separate "this sheet is moving under my
   * hand" from "the rest of the board may now follow it".
   */
  const holdRef = useRef({ held: false, confirmed: false });

  /** The answer to the current gesture's hold request, for a drag that ends before it arrives. */
  const claimRef = useRef<Promise<boolean> | null>(null);

  /**
   * Set when the server refused this gesture; read by the drag handlers so a
   * refused drag neither moves anything else nor saves anything. Cleared by
   * the next press.
   */
  const refusedRef = useRef(false);

  /**
   * Stops Framer moving the sheet for the rest of a refused press.
   *
   * State, because it has to reach the `drag` prop: Framer reads that prop on
   * every pointer move of a gesture already in progress, so turning it off
   * mid-drag is the one way to stop a drag it has started. Before this, a
   * refused sheet was set back once and then carried on following the pointer
   * — and its `onDragEnd` saved wherever it was dropped, straight through the
   * lock that had just said no.
   */
  const [isRefused, setIsRefused] = useState(false);
  const isPressedRef = useRef(false);
  const settleRef = useRef<AnimationPlaybackControls[]>([]);

  /** Where the sheet lives as far as the board knows. Read by async answers that outlive a render. */
  const homeRef = useRef({ x: note.positionX, y: note.positionY });
  homeRef.current = { x: note.positionX, y: note.positionY };

  /*
   * Read through refs, so the gesture handlers below can stay out of the
   * dependency arrays that keep this component's memo intact. A board hands
   * these down as stable callbacks, but a sheet must not depend on that being
   * true — see the note above `PostItProps`.
   */
  const holdApi = useRef({ onHold, onRelease, onDragBroadcast, onDragMove, onGroupDrag });
  holdApi.current = { onHold, onRelease, onDragBroadcast, onDragMove, onGroupDrag };

  /** Whether dependants may follow this sheet: always on a board without holds. */
  const isConfirmed = () => !holdApi.current.onHold || holdRef.current.confirmed;

  /**
   * Tells everything that follows this sheet where it now is: the connector
   * arrows, the rest of its group, and the rest of the room.
   *
   * Measured against `lastDragRef`, so a call after a pause — the first one
   * once a hold is confirmed — carries the whole distance travelled since, and
   * the group catches up in one step rather than being left behind.
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
   * A refused grab, undone gracefully.
   *
   * The sheet springs back to where the board says it lives rather than being
   * teleported there — the jump used to read as a glitch, the spring reads as
   * "somebody else has this" — and Framer is told to stop moving it for the
   * rest of the press.
   *
   * Nothing else needs undoing, and that is by design: while the answer was
   * pending, only the sheet itself moved (see `onDrag`). Its group, its
   * connectors and the room never heard about the gesture, so a refusal has
   * exactly one thing to put back.
   *
   * ## Why home is the stored position rather than the pre-drag one
   *
   * They are the same thing here and the stored one is the one that is still
   * true: the local drag has not been persisted, so the note's position is
   * exactly where the sheet was before the pointer went down. Using the note
   * rather than a captured origin also means a refusal that arrives *after* a
   * teammate's own move has landed puts the sheet where *they* put it, which
   * is the correct answer to "you do not have this".
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

  /**
   * Take hold, and undo the gesture if the answer is no.
   *
   * ## Why the sheet moves before permission arrives
   *
   * Because the alternative is worse in the common case to fix the rare one. A
   * hold is granted in a single map lookup on the server with no database
   * behind it, so it resolves in a few tens of milliseconds — but blocking on
   * it would make *every* drag on the board begin with a pause, including the
   * overwhelming majority where nobody else is anywhere near the sheet.
   *
   * Contention is rare; a stutter on every drag is constant. So the sheet
   * moves under the pointer at once, the rest of the board follows the moment
   * the grant arrives, and a refusal is undone by `refuse`.
   */
  const claim = useCallback(() => {
    const request = holdApi.current.onHold;
    if (!request || holdRef.current.held) return;

    holdRef.current = { held: true, confirmed: false };

    claimRef.current = request(note.id).then((granted) => {
      // Let go of before the answer came: nothing to confirm or undo.
      if (!holdRef.current.held) return granted;

      if (granted) {
        holdRef.current.confirmed = true;
        // A drag already under way catches its dependants up now, rather
        // than on the next pointer move — which never comes if the hand has
        // paused.
        if (isDraggingRef.current) propagateRef.current();
        return true;
      }

      holdRef.current = { held: false, confirmed: false };
      refuseRef.current();
      return false;
    });
  }, [note.id]);

  /*
   * The end of a press, wherever the pointer happens to be when it lifts.
   *
   * On `window`, because a drag routinely ends off the sheet, and a refused
   * press has to hand the `drag` prop back or the sheet could not be picked
   * up again. A stable function, so registering it on every press cannot
   * stack duplicates: the browser ignores a listener it already has.
   */
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
   * Whether the caret is in one of this sheet's two fields.
   *
   * Focus rather than `dirtyRef`, which was the first thing tried and is
   * wrong: `dirtyRef` only becomes true on the first *keystroke*, so somebody
   * who clicked into a note and paused to think would have had the sheet taken
   * out from under them by their own pointer-up.
   */
  const focusedRef = useRef(false);

  /**
   * Give the sheet back, unless it is still in use.
   *
   * The two ways a sheet is "in use" are a pointer on it and a caret in it,
   * and they overlap constantly — clicking into a textarea is a pointer
   * gesture that ends with the caret still there, and tabbing from the title
   * to the body is a blur immediately followed by a focus. So every exit
   * asks this one question rather than deciding for itself, which is what
   * stops a note being released between two halves of the same interaction.
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

  /*
   * A sheet that goes away while held has to let go of it.
   *
   * Switching board pages, collapsing the full-screen stage, or a teammate
   * deleting the note all unmount this component without any pointer event
   * ever ending — and without this the note stays locked for everybody else
   * until the server's TTL expires it.
   */
  const relinquishRef = useRef(relinquish);
  relinquishRef.current = relinquish;
  useEffect(() => () => relinquishRef.current(), []);

  /*
   * The debounce's safety net.
   *
   * `useDebouncedCallback` cancels its pending timer on unmount, which is right
   * for a position write nobody will miss and wrong for a sentence somebody
   * just typed: switching board pages, collapsing the full-screen stage or
   * closing a note within the two-second window would have thrown the edit away
   * silently. Blur covers the common path — clicking anything else moves focus
   * first — but not the ones where the component simply goes away.
   *
   * So the uncommitted payload is held here and flushed on the way out.
   */
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

  /*
   * A position that changed elsewhere (group drag, page switch, a teammate's
   * socket echo) has to land on the motion values, which React never touches on
   * its own — *unless this sheet is currently under somebody's finger*.
   *
   * That guard is the fix for a specific and very visible bug. Drop a note and
   * drag it immediately: the create response arrives mid-gesture carrying the
   * position the note was *posted* at, this effect fired, and the sheet jumped
   * out of the user's grip and back to where it started. The same thing could
   * happen on a shared board from a colleague's echo landing at the wrong
   * moment.
   *
   * Whoever is holding the sheet is the authority on where it is. Anything that
   * arrives while they are is not lost, only deferred: `onDragEnd` writes the
   * final position, and the next render after the gesture reconciles the rest.
   */
  useEffect(() => {
    if (isDraggingRef.current) return;

    x.set(note.positionX);
    y.set(note.positionY);
    lastDragRef.current = { x: note.positionX, y: note.positionY };

    /*
     * And the connector layer, which prefers a live override to the stored
     * position whenever it has one.
     *
     * A teammate's live drag publishes overrides for the sheet it moves, and
     * nothing ever withdrew them — so when that sheet later moved by any other
     * route (their undo, a group move, a position fixed up by the server) the
     * arrows stayed pinned to wherever the last live frame had left them.
     * Publishing the stored position here keeps any override equal to the
     * truth; for a sheet with none, it is a value the layer already had.
     */
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

  /*
   * The type scale, derived from the sheet and not from a render.
   *
   * This is the half that makes the resize *dynamic*. The corner handle writes
   * straight to `width` and `height` sixty times a second and deliberately
   * never touches React state, so anything computed in the component body —
   * including a font size — would be stale for the whole gesture and correct
   * only after it ended. A derived motion value is recomputed by the same
   * frame loop that moves the corner, so the words re-flow under the pointer
   * as the sheet changes shape.
   *
   * Declared here rather than beside the motion values it reads, because it
   * needs `isImage`: an image's height is its own, so its box has no second
   * dimension worth reading and it scales on width alone, which is the only
   * thing its handle changes.
   */
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

  /*
   * Corner drag, wired natively rather than through React.
   *
   * ## The bug this shape exists to fix
   *
   * The handle previously used `onPointerDown`, a React synthetic handler, and
   * called `stopPropagation()` to keep the gesture off the note. It did not
   * work: the note moved *while* it was being resized, which looked like the
   * card tearing itself apart under the pointer.
   *
   * The reason is where each listener actually lives. React attaches its
   * listeners once, at the root container, and replays them; Framer Motion
   * attaches `pointerdown` directly to the motion element. So for a press on
   * the handle the order is:
   *
   *   1. target phase — the handle
   *   2. bubble — the motion element, where **Framer starts the drag**
   *   3. bubble — the document root, where React finally runs our handler
   *
   * `stopPropagation()` at step 3 cannot un-start a drag begun at step 2. The
   * only place that can is a listener on the handle itself, in the target
   * phase, which is what this registers. Framer's own listener then never sees
   * the event, so there is nothing to cancel.
   *
   * Pointer capture rather than window listeners, so the gesture survives the
   * pointer leaving the 20px handle — which at any speed it immediately does —
   * and cannot be stranded by a `pointerup` that lands on another element.
   *
   * ## Why the position moves while the size does
   *
   * A sheet is drawn with `rotate`, and a rotation's origin is the box's
   * *centre*. Growing the box moves that centre by half the delta, and the
   * rotation then swings every corner around the new one — so dragging the
   * bottom-right handle also walked the top-left corner across the board. That
   * is what "it resizes from every side" was: not the size, the pivot.
   *
   * Setting `transform-origin: top left` would fix the pivot and silently
   * re-place every note already on every board, because a sheet rotated about
   * its corner sits somewhere else than the same sheet rotated about its
   * middle. So the origin stays where it is and the translation absorbs the
   * difference instead.
   *
   * With centre `c`, rotation `R` and layout position `P`, the sheet's top-left
   * corner lands at `P + t + c − R·c`. Holding that fixed across a size change
   * `c → c′` means the translation has to move by `(I − R)·(c − c′)`, which
   * with `Δ` for the size delta expands to exactly the two lines in `anchor()`
   * below. At zero rotation both terms vanish and nothing is compensated,
   * which is correct: an unrotated absolute box already grows right and down.
   */
  /*
   * The handle element itself, as state rather than a ref.
   *
   * The listener below is registered natively on this exact element, and the
   * handle is not permanent: it is unmounted while somebody else holds the
   * sheet and mounted again when they let go. With a ref and an effect that
   * ran once per note, the handle that came back was a new element with no
   * listener on it — so after any teammate had touched a sheet, pulling its
   * corner fell through to the note and dragged the whole thing instead. A
   * callback ref into state re-runs the effect for every element the handle
   * is ever drawn as.
   */
  const [resizeHandle, setResizeHandle] = useState<HTMLButtonElement | null>(null);

  /*
   * Mirrored into a ref because the resize listener is registered natively,
   * once per note, and must not be re-attached when a lock arrives — doing so
   * mid-gesture drops the drag. See the effect below.
   */
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
      /*
       * A sheet somebody else is holding cannot be resized, and this is the
       * guard that matters most of the three.
       *
       * A drag that is refused snaps back and nothing is lost. A resize that
       * is refused *after the fact* would reflow the text under the hand of
       * the person typing in it — the corner handle writes straight to the
       * motion values, so there is nothing to snap back to until the gesture
       * ends. So this one refuses before it starts rather than optimistically.
       */
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

      /*
       * A photograph is scaled; a written sheet is reshaped.
       *
       * Both are the same object with the same handle, but stretching a picture
       * to an arbitrary box is not resizing it — the image is `object-cover`
       * inside its frame, so a free drag crops the photograph rather than
       * making it bigger, which is not what a corner handle promises. Locking
       * to the ratio it already has means the corner does the one thing that
       * reads as correct on an image.
       *
       * Captured once per gesture rather than read per frame, so the ratio
       * cannot drift as the clamp bites at the edges of the allowed range.
       */
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

        // Straight through, not debounced: the gesture has ended, so there is
        // nothing left to coalesce and no reason to make the user wait for it.
        // Position travels with the size because the two are one gesture —
        // saving the box without the compensation would re-introduce the jump
        // on the next page load.
        saved.commit(next);
      };

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
    };

    /*
     * `passive: false` because this handler calls `preventDefault`.
     *
     * Chrome treats `pointerdown` on a touch-capable device as passive by
     * default, and a passive listener's `preventDefault` is ignored with a
     * console warning — which on touch means the browser scrolls the board
     * while the corner is being dragged.
     */
    handle.addEventListener('pointerdown', onPointerDown, { passive: false });
    return () => handle.removeEventListener('pointerdown', onPointerDown);
  }, [canResize, height, isImage, resizeHandle, width, x, y]);

  return (
    <motion.div
      // Held by somebody else: no drag, at the gesture level rather than by
      // cancelling one that has begun. `isRefused` is the one exception — a
      // grab the server turned down mid-gesture — and it is why this is read
      // live by Framer rather than once at the start.
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
      // No lift on a sheet that cannot be picked up. A hover response is a
      // promise that something will happen on click, and on a held note
      // nothing will.
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
      /*
       * A click that never became a drag still took hold, and has to give it
       * back — this is the exit `onDragEnd` does not cover, because Framer only
       * fires that once a drag threshold has been passed. Without it, selecting
       * a note by clicking it would lock the note for everybody else until this
       * tab closed.
       *
       * Ordering works out: the browser runs focus as the default action of
       * pointer-down, so by the time this fires `focusedRef` is already true
       * for a click that landed in a text field, and `maybeRelease` keeps the
       * hold for it.
       */
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
        /*
         * Only the sheet moves until the hold is confirmed.
         *
         * Its group, its arrows and the rest of the room wait for the grant —
         * a few tens of milliseconds, and `claim` catches them all up in one
         * step when it lands. That is what keeps a refusal cheap: the sheet is
         * the only thing that ever moved, so it is the only thing to put back,
         * and nobody else's board ever saw a drag that did not happen.
         */
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
          /*
           * `note.id` is read at call time, so a sheet whose placeholder id was
           * swapped for the server's mid-drag persists under the *real* id — the
           * element survived the swap (see `Note.clientKey`), so this closure is
           * the current render's and knows the new one.
           */
          onDragEnd(note.id, { positionX: x.get(), positionY: y.get() });

          /*
           * Let go *after* the position has been handed to the board, never
           * before. Releasing first opens a window in which a teammate can take
           * the sheet and start moving it while this client's batched PATCH for
           * the old gesture is still in flight — and the later write wins, which
           * is the exact race the hold exists to close.
           *
           * Not released when the sheet is also being typed in: focus holds it
           * for as long as the caret is there, and a drag that ended should not
           * take somebody's textarea out from under them. `maybeRelease` is the
           * one place that decides.
           */
          maybeRelease();
        };

        if (isConfirmed()) {
          finish();
          return;
        }

        /*
         * A flick that ended before the answer arrived.
         *
         * Nothing is saved until the server has said yes — saving first is the
         * last-write-wins race again, arrived at by being quick. The sheet
         * keeps its authority over its own position meanwhile
         * (`isDraggingRef` stays up), and a refusal lands in `refuse` exactly
         * as it would have mid-drag.
         */
        void claimRef.current?.then((granted) => {
          if (granted && !refusedRef.current) finish();
        });
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
        'postit group/note absolute flex flex-col cursor-grab touch-none select-none active:cursor-grabbing',
        // A written sheet's padding is a motion value (it shrinks with the
        // sheet); an image's is fixed, because the picture inside it is what
        // carries the size.
        isImage ? 'p-2' : 'postit-grain',
        isSelected && 'ring-2 ring-brand ring-offset-2 ring-offset-surface-sunken',
        isConnectSource && 'ring-2 ring-positive ring-offset-2 ring-offset-surface-sunken',
        isConnectTarget && 'cursor-crosshair',
        // The dashed ring in the holder's own colour — see `.postit--held`.
        heldBy && 'postit--held',
      )}
    >
      {/*
        Who has it.

        Above the sheet rather than on it, in the same position the connect
        mode's "from here" chip uses, because that is where this board already
        puts "something is happening to this note". The name is not optional
        decoration: a sheet that simply stopped responding reads as a bug, and
        a sheet with somebody's name on it reads as theirs.
      */}
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
          /*
           * Read-only rather than disabled while somebody else has the sheet.
           *
           * A disabled input is not focusable, is skipped by a screen reader's
           * form navigation, and is greyed out by the browser — which on a
           * coloured Post-it looks like the note itself has been deactivated.
           * `readOnly` keeps the text selectable and copyable, which is what a
           * reader wants to do with a colleague's note while they are writing
           * it, and refuses only the typing.
           */
          readOnly={Boolean(heldBy)}
          value={titleDraft}
          /*
           * Focus is a hold, and this is the second half of the guarantee.
           *
           * Typing is not a gesture with a beginning and an end the way a drag
           * is — somebody can sit in a note for a minute — so the hold is taken
           * when the caret arrives and given back when it leaves. That is also
           * what makes "cannot be resized while somebody is typing in it" fall
           * out for free: it is the same one lock.
           */
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
            /*
             * On the next task, not this one.
             *
             * Tabbing from the title to the body is a blur immediately
             * followed by a focus, and releasing synchronously here would let
             * go of the sheet in the gap between them — a window of one turn
             * in which a teammate could take it, which is short enough to be
             * rare and therefore exactly the kind of bug that only ever
             * happens to somebody else. A microtask puts the decision after
             * the focus that follows.
             */
            queueMicrotask(maybeRelease);
          }}
          // Explicit, rather than relying on `maxlength` alone: the attribute
          // silently swallows the tail of an over-long paste mid-word, and
          // `clampText` above only sees what the browser already trimmed. See
          // `clampOnPaste`.
          onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.noteTitle)}
          placeholder={t(isImage ? 'notes.imageCaption' : 'notes.noteTitle')}
          maxLength={TEXT_LIMITS.noteTitle}
          className={cn(
            'w-full bg-transparent font-bold outline-none placeholder:opacity-40',
            isImage ? 'font-sans text-xs' : 'font-hand',
          )}
          style={{
            color: isImage ? undefined : ink,
            // An image's caption keeps its fixed `text-xs`: it is a label on a
            // picture rather than writing on a sheet, and it sits under a box
            // whose height the reader does not control.
            ...(isImage ? {} : { fontSize: titleSize }),
          }}
        />

        {/*
          Every control on the sheet goes with the sheet.

          Pinning, recolouring and deleting are all writes to the same row the
          holder is editing, so letting them through would be the same
          last-write-wins race the drag lock closes, arrived at through a
          different button.
        */}
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
        <motion.img
          src={note.imageUrl ?? ''}
          alt={note.title ?? t('notes.boardImage')}
          draggable={false}
          // Decoded off the main thread and fetched only once it is worth
          // fetching: a board can pin dozens of photographs, and the ones below
          // the fold should not compete with the ones on screen.
          loading="lazy"
          decoding="async"
          // The board stores the box; the picture fits inside it. `motion.img`
          // rather than a plain one so the corner handle's live height — a
          // motion value — can drive it without a render per frame.
          className="pointer-events-none block w-full rounded-[2px] object-cover"
          style={{ maxHeight: height }}
        />
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
          /*
           * `overflow-auto` stays, and is now the floor rather than the
           * behaviour. The type scales with the sheet, so the common case —
           * a note holding what a note holds — fits; the scrollbar is what
           * catches somebody who pasted an essay into an 80px square, which
           * the counter below warns about before they get there.
           */
          className="min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent font-hand leading-relaxed outline-none placeholder:opacity-40"
          style={{ color: ink, fontSize }}
        />
      )}

      {/*
        How much room is left, shown only when it is nearly gone.

        The limit is 2,000 characters and it is enforced three ways already —
        `clampText`, `clampOnPaste` and `maxLength` — so nothing can exceed it.
        What was missing was any warning that it exists: typing simply stopped
        working, which reads as a broken note rather than as a full one. This
        appears in the last tenth and counts down.

        Absolutely positioned, so it cannot push the textarea it annotates, and
        `pointer-events-none` so it is never a target between the reader and
        the corner handle beneath it.
      */}
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

      {/*
       * The corner handle.
       *
       * Bottom-right, drawn as two short rules the way every resizable pane on
       * the desktop draws one, and permanently visible on a coarse pointer —
       * where "appears on hover" means "does not exist".
       */}
      {canResize && !heldBy && (
        <button
          ref={setResizeHandle}
          type="button"
          aria-label={t('notes.resizeNote')}
          title={t('notes.resizeNote')}
          // The gesture itself is registered natively — see the effect above.
          // This only stops the click that follows the drag from reaching the
          // note underneath and selecting it.
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

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One reversible thing somebody did to a board.
 *
 * `undo` and `redo` are thunks rather than a description of the change, and
 * that is deliberate: a board action is not one shape. Creating a note is a
 * POST, moving six is a batched position write, grouping is a write with a
 * different verb again. A generic diff engine over the board snapshot could
 * express all of them and would have to be kept in step with every mutation in
 * two query files; a pair of closures is written next to the action it reverses
 * and cannot drift away from it.
 */
export interface BoardAction {
  /** Named for the toast, in the reader's own language. Set by the caller. */
  label: string;
  undo: () => void;
  redo: () => void;
}

/**
 * How many steps back the board remembers.
 *
 * Deep enough to cover a session's worth of fiddling, shallow enough that the
 * closures it holds — each of which captures a note's previous content — cannot
 * become a memory leak on a board somebody leaves open all day.
 */
const DEPTH = 60;

/**
 * Whether a keystroke belongs to something the user is typing in.
 *
 * This is the single most important check in the file. A Post-it *is* a text
 * field, so Ctrl+Z inside one must undo the last few characters — the browser's
 * own text history — and not silently delete the note the caret is sitting in.
 * Getting this backwards would make the feature actively destructive on the one
 * gesture people use it for most.
 */
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    // A composed widget can put the caret in a descendant while the element
    // carrying the attribute is an ancestor.
    Boolean(target.closest('[contenteditable="true"]'))
  );
};

interface BoardHistory {
  /** Push an action onto the stack. A no-op while an undo or redo is running. */
  record: (action: BoardAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Throw the stacks away — used when the board being edited changes. */
  clear: () => void;
}

/**
 * Ctrl+Z and Ctrl+Y for a notes board.
 *
 * ## Why the history is client-side and per session
 *
 * Because it is a *typing* affordance, not an audit trail. The product already
 * has the durable version of this — the project changelog, where any recorded
 * action can be reversed for thirty days by anybody with the rights — and that
 * is the right tool for "who moved this and can we put it back on Thursday".
 * This is the other thing entirely: the half-second reflex after dropping a
 * note in the wrong place. Persisting it would mean writing a server-side
 * command log for a stack whose entire useful lifetime is the current visit.
 *
 * It follows that the stack is emptied when the board changes and never
 * restored on reload. Both are correct rather than merely cheap: an undo stack
 * that survives a refresh would offer to reverse edits the user has stopped
 * being able to see, and one that survived a page change would reverse them on
 * the wrong wall.
 *
 * ## Why redo is cleared on a new action
 *
 * The standard rule, and worth stating because the alternative is tempting.
 * Once somebody undoes two steps and then does something new, the branch they
 * undid is no longer reachable from where they are; keeping it means a later
 * Ctrl+Y applies a change that was never part of this sequence. Dropping it is
 * what every editor does and what everybody expects.
 *
 * ## What is not undoable, and why that is honest
 *
 * Clearing a page and clearing the ink are left out. Both delete every row on
 * the surface in one server call and neither returns what it destroyed, so an
 * "undo" for them could only be a hopeful re-creation from whatever the client
 * still had cached — which is exactly the kind of undo that quietly loses work
 * and teaches people not to trust the feature. They keep their own confirmation
 * dialog instead.
 */
export const useBoardHistory = (
  /** Changing this empties the stacks: a different board is a different past. */
  boardKey: string | number,
): BoardHistory => {
  const past = useRef<BoardAction[]>([]);
  const future = useRef<BoardAction[]>([]);

  /*
   * A counter purely to re-render the toolbar.
   *
   * The stacks live in refs because every board gesture would otherwise
   * re-render the whole wall to store a closure nobody is looking at. What the
   * UI actually needs is two booleans, so the render is driven by a version
   * number bumped only when those booleans can have changed.
   */
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((current) => current + 1), []);

  /*
   * Guards the stacks against the actions they are replaying.
   *
   * An `undo` thunk calls the same mutations the original gesture did. If any
   * caller records from inside a mutation callback rather than from the gesture
   * handler, that would push the reversal onto the stack as a new action and
   * the two would ping-pong for ever. This makes that impossible by
   * construction rather than by convention.
   */
  const isReplaying = useRef(false);

  const record = useCallback(
    (action: BoardAction) => {
      if (isReplaying.current) return;

      past.current.push(action);
      if (past.current.length > DEPTH) past.current.shift();
      future.current = [];
      bump();
    },
    [bump],
  );

  const run = useCallback(
    (action: BoardAction, direction: 'undo' | 'redo') => {
      isReplaying.current = true;
      try {
        action[direction]();
      } finally {
        /*
         * Released synchronously, not in a promise callback.
         *
         * The thunks fire optimistic mutations, which paint immediately and
         * settle later. Holding the flag until the request came back would
         * leave a window of several hundred milliseconds in which a *genuine*
         * new gesture by the user was silently dropped from the history.
         */
        isReplaying.current = false;
      }
    },
    [],
  );

  const undo = useCallback(() => {
    const action = past.current.pop();
    if (!action) return;

    run(action, 'undo');
    future.current.push(action);
    bump();
  }, [bump, run]);

  const redo = useCallback(() => {
    const action = future.current.pop();
    if (!action) return;

    run(action, 'redo');
    past.current.push(action);
    bump();
  }, [bump, run]);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    bump();
  }, [bump]);

  // A different board is a different past. See the note on the hook.
  useEffect(() => {
    past.current = [];
    future.current = [];
    bump();
  }, [boardKey, bump]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Ctrl on Windows and Linux, Cmd on a Mac. `metaKey` alone on Windows is
      // the Windows key, which owns its own shortcuts and must be left alone.
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;

      // The caret is in a Post-it, a title field or a search box: this belongs
      // to the text, not to the board. See `isTypingTarget`.
      if (isTypingTarget(event.target)) return;

      /*
       * Redo is spelled two ways and both are expected: Ctrl+Y is the Windows
       * convention, Ctrl/Cmd+Shift+Z is the Mac and Adobe one. Supporting only
       * one of them means half the people who try it conclude there is no redo.
       */
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);

      // Claimed before doing anything, so the browser's own document-level undo
      // never also fires and rewinds something else on the page.
      event.preventDefault();

      if (isRedo) redo();
      else undo();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [redo, undo]);

  return {
    record,
    undo,
    redo,
    // Read through `version` so the toolbar re-renders when they flip; the refs
    // themselves are not reactive.
    canUndo: version >= 0 && past.current.length > 0,
    canRedo: version >= 0 && future.current.length > 0,
    clear,
  };
};

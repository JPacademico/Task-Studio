import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One reversible thing somebody did to a board. `undo` and `redo` are thunks rather than a
 * description of the change, and that is deliberate: a board action is not one shape.
 */
export interface BoardAction {
  /** Named for the toast, in the reader's own language. Set by the caller. */
  label: string;
  undo: () => void;
  redo: () => void;
}

/**
 * How many steps back the board remembers. Deep enough to cover a session's worth of fiddling,
 * shallow enough that the closures it holds — each of which captures a note's previous content.
 */
const DEPTH = 60;

/**
 * Whether a keystroke belongs to something the user is typing in. This is the single most important
 * check in the file.
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

/** Ctrl+Z and Ctrl+Y for a notes board. */
export const useBoardHistory = (
  /** Changing this empties the stacks: a different board is a different past. */
  boardKey: string | number,
): BoardHistory => {
  const past = useRef<BoardAction[]>([]);
  const future = useRef<BoardAction[]>([]);

  // A counter purely to re-render the toolbar. The stacks live in refs because every board gesture
  // would otherwise re-render the whole wall to store a closure nobody is looking at.
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((current) => current + 1), []);

  // Guards the stacks against the actions they are replaying. An `undo` thunk calls the same
  // mutations the original gesture did.
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
        // Released synchronously, not in a promise callback. The thunks fire optimistic mutations,
        // which paint immediately and settle later.
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

      // Redo is spelled two ways and both are expected: Ctrl+Y is the Windows convention,
      // Ctrl/Cmd+Shift+Z is the Mac and Adobe one.
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

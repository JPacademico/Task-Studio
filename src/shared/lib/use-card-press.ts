import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * How far the pointer may travel between press and release and still count as a click rather than
 * as the beginning of a drag.
 */
const DRAG_SLOP_PX = 6;

/**
 * How long a press may last and still count as a click. `TouchSensor` starts a drag after a 160ms
 * hold, and a finger that has held still for a third of a second is somebody picking a card up.
 */
const HOLD_MS = 320;

/**
 * The selectors whose own click handler owns the press. A card is covered in smaller controls — a
 * tick box, a pin, a bin, a link to the project.
 */
const INTERACTIVE = 'a,button,input,select,textarea,label,[role="button"],[data-card-ignore]';

/**
 * Whether the press landed on a control *inside* the card. `closest()` walks all the way to the
 * document root, and it does not stop at the element the handler is bound to.
 */
const isOwnedByInnerControl = (
  target: EventTarget | null,
  card: EventTarget & Element,
): boolean => {
  const hit = (target as Element | null)?.closest?.(INTERACTIVE);
  return Boolean(hit && hit !== card && card.contains(hit));
};

interface CardPressHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Makes a whole card open on click without stealing the gestures on it. Only the *title* opened a
 * task.
 */
export const useCardPress = (onOpen: (() => void) | undefined): CardPressHandlers | undefined => {
  // Where and when the press started.
  const press = useRef<{ x: number; y: number; at: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    press.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  }, []);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!onOpen) return;

      // A control inside the card owns this press. See `isOwnedByInnerControl`
      // for why "inside" has to be checked and cannot be assumed.
      if (isOwnedByInnerControl(event.target, event.currentTarget)) return;

      // Text somebody has just selected on the card. Dragging across a title to copy it is a press
      // that moves — already caught below.
      if (!window.getSelection()?.isCollapsed) return;

      const start = press.current;
      press.current = null;

      // A click with no press behind it is a keyboard or assistive-technology
      // activation, which is unambiguous and always opens.
      if (start) {
        const travelled = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (travelled > DRAG_SLOP_PX) return;
        if (performance.now() - start.at > HOLD_MS) return;
      }

      onOpen();
    },
    [onOpen],
  );

  return useMemo(
    () => (onOpen ? { onPointerDown, onClick } : undefined),
    [onOpen, onPointerDown, onClick],
  );
};

import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * How far the pointer may travel between press and release and still count as a
 * click rather than as the beginning of a drag.
 *
 * Six pixels, which is not a guess: it is exactly the `activationConstraint`
 * the boards give dnd-kit's `PointerSensor`. Anything looser would open a card
 * on a drag the sensor had already claimed; anything tighter would refuse a
 * click from somebody whose hand is not perfectly still, which is most people
 * on a trackpad.
 */
const DRAG_SLOP_PX = 6;

/**
 * How long a press may last and still count as a click.
 *
 * `TouchSensor` starts a drag after a 160ms hold, and a finger that has held
 * still for a third of a second is somebody picking a card up, not tapping it.
 * 320ms leaves the sensor room to claim the gesture first while staying well
 * above a deliberate tap, which lands around 90–150ms.
 */
const HOLD_MS = 320;

/**
 * The selectors whose own click handler owns the press.
 *
 * A card is covered in smaller controls — a tick box, a pin, a bin, a link to
 * the project. Without this, opening the card would happen *as well as*
 * whatever they do, so ticking a task off would tick it and then open it.
 * Checked with `closest` rather than by comparing `target` to `currentTarget`,
 * because the actual event target is usually an `<svg>` inside the button.
 */
const INTERACTIVE = 'a,button,input,select,textarea,label,[role="button"],[data-card-ignore]';

interface CardPressHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClick: (event: ReactPointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => void;
}

/**
 * Makes a whole card open on click without stealing the gestures on it.
 *
 * ## Why the card needed this at all
 *
 * Only the *title* opened a task. That is a 200px-wide, 20px-tall strip in a
 * card the size of a business card, and everybody's first attempt — clicking
 * the middle of it, clicking the badges, clicking the coloured edge — did
 * nothing at all. Nothing is the worst answer a target can give: a refusal at
 * least tells you where the target is.
 *
 * ## Why it cannot simply be `onClick` on the card
 *
 * Because these cards are draggable, and a drag ends with a `click` event on
 * the element the pointer went down on. A naive handler therefore opens the
 * task every time somebody moves one between columns — which is both wrong and
 * infuriating, since the modal lands on top of the board they were arranging.
 *
 * dnd-kit will not do this for us: it calls `preventDefault` on the events it
 * claims, and `defaultPrevented` on the synthetic click is not reliably set by
 * the time React dispatches it. So the press is measured here, in the two
 * dimensions that separate a click from a drag — distance and time — using the
 * sensors' own thresholds so the two can never disagree about what a gesture
 * was.
 *
 * A press that travelled, or a press that was held, is a drag. Everything else
 * is a click.
 */
export const useCardPress = (onOpen: (() => void) | undefined): CardPressHandlers | undefined => {
  /*
   * Where and when the press started. A ref rather than state, deliberately:
   * this changes on every pointerdown and nothing renders differently for it,
   * so putting it in state would re-render every card on the board each time
   * somebody touched one.
   */
  const press = useRef<{ x: number; y: number; at: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    press.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  }, []);

  const onClick = useCallback(
    (event: ReactPointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      if (!onOpen) return;

      // A control inside the card owns this press. See `INTERACTIVE`.
      if ((event.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return;

      /*
       * Text somebody has just selected on the card.
       *
       * Dragging across a title to copy it is a press that moves — already
       * caught below — but a double-click that selects a word is a press that
       * does not, and opening a modal over the words somebody was reading is
       * the same class of surprise this hook exists to prevent.
       */
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

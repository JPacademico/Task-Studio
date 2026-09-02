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

/**
 * Whether the press landed on a control *inside* the card.
 *
 * ## The bug this exists to prevent, which shipped
 *
 * `closest()` walks all the way to the document root, and it does not stop at
 * the element the handler is bound to. On both boards the card is wrapped by
 * dnd-kit's draggable node, and `useDraggable().attributes` sets
 * **`role="button"`** on it (`defaultRole = 'button'` in `@dnd-kit/core`) —
 * which the boards spread onto that wrapper.
 *
 * So `target.closest('[role="button"]')` matched the *wrapper* for every press
 * anywhere on the card, the guard below concluded that a control owned it, and
 * the card never opened. The one place that still worked was the title, which
 * is a real `<button>` carrying its own `onClick` — which is exactly the
 * symptom reported: "it only opens when you click next to the task name".
 *
 * The fix is to bound the search: a match only counts when it is a *descendant*
 * of the element the handler is on. `contains()` returns true for the node
 * itself, so the card is excluded explicitly — otherwise a card that happened
 * to be rendered as a `<button>` would suppress its own handler.
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
    (event: React.MouseEvent<HTMLElement>) => {
      if (!onOpen) return;

      // A control inside the card owns this press. See `isOwnedByInnerControl`
      // for why "inside" has to be checked and cannot be assumed.
      if (isOwnedByInnerControl(event.target, event.currentTarget)) return;

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

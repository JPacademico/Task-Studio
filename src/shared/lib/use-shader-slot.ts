import { useEffect, useState } from 'react';

/**
 * How many shader-backed controls may hold a WebGL context at one time.
 *
 * Two, because two is what the application legitimately shows: the top bar's
 * "New project" and a project page's "New task" can be on screen together, and
 * nothing else uses this. The number is a *ceiling on a mistake* rather than a
 * budget anybody is expected to spend — if a third one ever appears it will be
 * because somebody put a shader button in a list, and this is what stops that
 * being a page with forty GPU contexts on it.
 */
const MAX_CONCURRENT = 2;

/**
 * A permit to run one small decorative canvas.
 *
 * ## Why a cap exists at all, on top of `useCanvasBudget`
 *
 * They guard different failures and neither covers the other.
 *
 * `useCanvasBudget` asks "should *this* element run a canvas here, now" — is
 * the machine capable, has the reader asked for less motion, is it on screen,
 * is the tab in front. Every one of those is a property of one element and its
 * moment, and every one of them can be true for an unlimited number of
 * elements at once.
 *
 * That is the gap. A browser hands out a small, finite number of WebGL
 * contexts — commonly sixteen — and starts silently discarding the oldest when
 * it runs out, which shows up as canvases going blank in the order they were
 * created rather than as an error anybody can search for. Long before that,
 * the cost of *n* independent three.js scenes on a shared-CPU machine is
 * simply *n* times one scene.
 *
 * The landing page's two full-bleed washes are individually large and
 * inherently few. A button is individually tiny and inherently repeatable,
 * which is exactly the shape that needs a ceiling.
 *
 * ## Why first-come rather than a priority
 *
 * Because the two callers are equally important and a tie-break would be
 * invented. Whoever mounts first draws; a third gets the CSS gradient, which
 * is what every reader on a phone, a weak machine or reduced motion already
 * sees and which is a perfectly good button.
 *
 * ## How a slot is released
 *
 * On unmount, and on the effect re-running with `wanted` false — so scrolling
 * a button off screen (which flips `useCanvasBudget`) hands the permit to
 * whoever is waiting rather than holding it until navigation.
 */
let held = 0;

/**
 * Woken when a permit is returned, so a waiter can claim it.
 *
 * The callbacks answer whether they took the permit, which is what lets the
 * release loop stop at the first one that succeeds instead of waking every
 * waiter to fight over a single slot.
 */
const waiting = new Set<() => boolean>();

export const useShaderSlot = (wanted: boolean): boolean => {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!wanted) {
      setGranted(false);
      return;
    }

    let mine = false;

    const claim = (): boolean => {
      if (mine || held >= MAX_CONCURRENT) return false;
      held += 1;
      mine = true;
      setGranted(true);
      return true;
    };

    // Try immediately; if the permits are all out, wait to be woken.
    if (!claim()) waiting.add(claim);

    return () => {
      waiting.delete(claim);
      if (!mine) return;

      held -= 1;
      mine = false;

      /*
       * Woken one at a time, and the callback removes itself when it succeeds.
       *
       * Iterating a copy because `claim` mutates the set it is being iterated
       * from — a waiter that wins deletes itself, and a `Set` mutated during
       * its own iteration is the kind of thing that works until it does not.
       */
      for (const wake of [...waiting]) {
        if (wake()) {
          waiting.delete(wake);
          break;
        }
      }
    };
  }, [wanted]);

  return granted;
};

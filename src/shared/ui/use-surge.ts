import { useEffect, type RefObject } from 'react';

/**
 * Sets `data-surge` on an element every `min`–`max` ms, first after `first`, restarting the CSS
 * animations it selects each time. Quiet while the tab is hidden.
 */
export const useSurge = (
  ref: RefObject<Element | null>,
  isEnabled: boolean,
  first: number,
  min: number,
  max: number,
) => {
  useEffect(() => {
    const element = ref.current;
    if (!isEnabled || !element) return;

    let timer = 0;
    const fire = () => {
      if (document.visibilityState === 'visible') {
        element.removeAttribute('data-surge');
        // Reading a layout value flushes the removal, so setting it again starts the animations over.
        void element.getBoundingClientRect();
        element.setAttribute('data-surge', '');
      }
      timer = window.setTimeout(fire, min + Math.random() * (max - min));
    };

    timer = window.setTimeout(fire, first);
    return () => {
      window.clearTimeout(timer);
      element.removeAttribute('data-surge');
    };
  }, [ref, isEnabled, first, min, max]);
};

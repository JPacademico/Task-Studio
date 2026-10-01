import { useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useCanvasBudget } from '@/shared/lib/use-canvas-budget';

/** How many blobs are in the tube. See the note below on why five and not ten. */
const BLOBS = [0, 1, 2, 3, 4];

/**
 * The lamp inside a `.ui-lava` control: wax rising through fluid. The previous version was two
 * `::before`/`::after` gradients, and two is the hard ceiling on pseudo-elements.
 */
export const LavaSurface = () => {
  const host = useRef<HTMLSpanElement>(null);
  const isRunning = useCanvasBudget(host, '0px');

  return (
    <span
      ref={host}
      aria-hidden
      className={cn('lava-lamp', !isRunning && 'lava-lamp--still')}
    >
      {/* The filtered group. Everything inside is drawn through `#lava-goo` — see `index.html`. */}
      <span className="lava-lamp__goo">
        <span className="lava-pool lava-pool--bottom" />
        {BLOBS.map((index) => (
          <span key={index} className="lava-blob" />
        ))}
        <span className="lava-pool lava-pool--top" />
      </span>
    </span>
  );
};

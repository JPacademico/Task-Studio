import { useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useCanvasBudget } from '@/shared/lib/use-canvas-budget';

/** How many blobs are in the tube. See the note below on why five and not ten. */
const BLOBS = [0, 1, 2, 3, 4];

/**
 * The lamp inside a `.ui-lava` control: wax rising through fluid.
 *
 * ## Why this is markup and not more pseudo-elements
 *
 * The previous version was two `::before`/`::after` gradients, and two is the
 * hard ceiling on pseudo-elements — which is the whole reason it never looked
 * like anything. A lava lamp needs blobs moving *independently*: different
 * sizes, different speeds, different heights, each deforming on its own clock.
 * Two layers can only ever produce two shapes drifting in step.
 *
 * Seven elements is what buys the effect, and they are seven empty spans with
 * no text, no events and no measurement. The cost is in the animation, which is
 * gated below; the DOM is free.
 *
 * ## Why five blobs and two pools
 *
 * The reference has ten and fills a viewport. A button is about 40 pixels tall,
 * and past five the goo filter merges everything into one moving mass — more
 * elements, less legible motion. The two pools are not optional: they are the
 * wax at the ends of the tube that a blob pinches off from and merges into, and
 * without them the blobs just leave through the top edge.
 *
 * ## Why `useCanvasBudget` gates a CSS animation
 *
 * It was written for WebGL and the question it answers is not about WebGL: is
 * this element on screen, is the tab in front, has the reader asked for less
 * motion, and is the machine up to a continuous animation. All four are exactly
 * the reasons to stop a lamp.
 *
 * What stopping actually saves is the whole of it. The expensive part here is
 * not the filter — a reference filter costs nothing while nothing underneath it
 * changes — it is the five moving blobs *invalidating* that filter sixty times
 * a second. Pause them and the browser keeps the rasterised result; the button
 * costs exactly what a flat one does. So `.lava-lamp--still` pauses and leaves
 * the filter alone, which also means a lamp scrolled half out of view holds its
 * shape instead of popping apart into five plain circles.
 *
 * `rootMargin: '0px'` rather than the hook's default 200px: there is nothing to
 * warm up, so a lamp starts the moment it is genuinely visible and stops the
 * moment it is not.
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
      {/*
        The filtered group. Everything inside is drawn through `#lava-goo` — see
        `index.html` — so blobs that touch fuse into one shape with a neck
        between them instead of overlapping like two circles.
      */}
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

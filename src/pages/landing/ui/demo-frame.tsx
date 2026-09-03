import { useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

/**
 * The frame every demo loop sits in, and the clock that drives them.
 *
 * ## Why these are animations and not screen recordings
 *
 * A landing page showing "a few seconds of the product working" almost always
 * means an `.mp4`, and that was the obvious thing to build. It is the wrong
 * thing here, for four reasons that all point the same way:
 *
 *   - **Weight.** Three short clips at a readable resolution is several
 *     megabytes, served from a free tier, to a visitor who has not decided
 *     they want the product yet. These loops are a few kilobytes of markup
 *     that ship inside a chunk the page already downloads.
 *   - **The app has thirteen skins.** A recording is frozen in whichever one
 *     was on when it was taken, so it would show newsprint to somebody looking
 *     at a page rendered in the terminal palette. These are built from the
 *     same design tokens as the app, so a demo *is* the reader's own theme.
 *   - **Autoplay.** Silent looping video is allowed everywhere and is still
 *     the thing that stalls on a metered connection, fights Low Power Mode on
 *     iOS, and shows a play button where a demo was meant to be.
 *   - **Truth.** A recording ages the moment a button moves. These are
 *     assembled from the app's real components and tokens, so they go stale
 *     visibly and loudly rather than quietly.
 *
 * What is given up is real: a recording proves the product exists in a way a
 * recreation does not. The mitigation is that every loop below shows a
 * *mechanism* rather than a claim — a card actually moving between two named
 * columns, an import actually stepping through its named stages — so what it
 * asserts is checkable the moment somebody signs up.
 *
 * ## The clock
 *
 * One `useDemoClock` per demo, ticking through a fixed number of steps. Each
 * loop is a state machine rather than a keyframe timeline, because the app it
 * is imitating is one too: "the card is in Doing" is a state, and a demo built
 * from states cannot drift out of sync with itself the way parallel keyframes
 * do.
 *
 * Under `prefers-reduced-motion` the clock stops on the **last** step rather
 * than the first. That is deliberate: the last frame of each loop is the one
 * where the thing has happened — the card has landed, the project exists — so
 * a still reader sees the outcome the demo is about rather than its setup.
 */

/**
 * Steps through `0…steps-1` on a loop, or holds the final step when motion is
 * turned off.
 */
export const useDemoClock = (steps: number, intervalMs = 1_500): number => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStep(steps - 1);
      return;
    }

    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [intervalMs, reduceMotion, steps]);

  return step;
};

interface DemoFrameProps {
  /** The one-word label on the tab, naming the surface being shown. */
  tab: string;
  title: ReactNode;
  /** Which side the copy sits on. Alternated down the page. */
  side?: 'left' | 'right';
  children: ReactNode;
}

/**
 * One demo: a paper panel with a loop in it, and the sentence it is evidence
 * for.
 *
 * The copy and the panel swap sides down the page. Not for variety — because
 * three identical rows read as a table, and the eye stops travelling. The
 * alternation is what keeps somebody scrolling past the second one.
 */
export const DemoFrame = ({
  tab,
  title,
  side = 'left',
  children,
}: DemoFrameProps) => (
  <div
    className={cn(
      'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
      side === 'right' && 'lg:[&>*:first-child]:order-2',
    )}
  >
    {/* --- What it is -------------------------------------------------

        A single line, and nothing under it.

        There used to be a kicker above the heading and a paragraph below it.
        Both are gone, and for the same reason: the panel beside this is a
        working interface, and every word next to it is a word competing with
        the thing it is describing for the one glance this section gets. The
        paragraph was the worse offender — three or four lines explaining a
        mechanism that was, at that exact moment, playing on the right-hand
        side of the screen. Somebody who reads it learns nothing the loop was
        not about to show them; somebody who watches the loop never reaches the
        end of it.

        What is left is the claim itself. The heading says what the thing does
        in one line, the demo proves it, and the reader spends their attention
        on the proof. It also lets the type run larger, which is what makes a
        one-line claim read as a statement rather than as a caption. */}
    <div>
      <h3 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h3>
    </div>

    {/* --- The loop ----------------------------------------------------

        A tabbed panel rather than a browser chrome mock. A fake address bar
        would be pretending this is a screenshot of a website; the tab says
        which surface of the app is being shown, which is the thing a reader
        actually needs in order to place what they are looking at. */}
    <div className="relative">
      <span
        aria-hidden
        className="absolute -top-[26px] left-5 rounded-t-lg border border-b-0 border-edge bg-surface-raised px-3 py-1 text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint"
      >
        {tab}
      </span>

      <div className="panel relative overflow-hidden p-4 sm:p-5">{children}</div>
    </div>
  </div>
);

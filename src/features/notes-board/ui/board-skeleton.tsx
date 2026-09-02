import { SkinLoader } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * Paper on the wall before the wall has been read.
 *
 * Both boards used to draw nothing while their snapshot was in flight: the
 * whiteboard rendered an empty grid with the "Stick up a Post-it" prompt in the
 * middle of it, so an arriving user was told their populated board was blank
 * and then watched it fill in. The personal board replaced the entire page with
 * a centred spinner, which at least did not lie but took the toolbar and the
 * pager away with it.
 *
 * So: the surface, its grid and its chrome stay exactly where they are, and the
 * objects that have not arrived yet are stood in for by ghost sheets in
 * roughly the places sheets end up. It reads as "loading" without a caption
 * having to say so, and nothing on screen moves when the real notes land.
 *
 * `aria-hidden`, with the live region left to the loader: a screen reader
 * should hear "loading the board", not six empty rectangles.
 */
const GHOSTS = [
  { left: '6%', top: '12%', width: 190, height: 190, rotate: -3 },
  { left: '30%', top: '20%', width: 210, height: 170, rotate: 2 },
  { left: '56%', top: '10%', width: 180, height: 200, rotate: -1.5 },
  { left: '14%', top: '55%', width: 200, height: 160, rotate: 1.5 },
  { left: '44%', top: '58%', width: 170, height: 180, rotate: -2.5 },
  { left: '70%', top: '46%', width: 195, height: 175, rotate: 3 },
];

export const BoardSkeleton = ({ className }: { className?: string }) => {
  const t = useT();

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div aria-hidden className="absolute inset-0">
        {GHOSTS.map((ghost) => (
          <div
            key={ghost.left + ghost.top}
            className="skeleton absolute rounded-[4px]"
            style={{
              left: ghost.left,
              top: ghost.top,
              width: ghost.width,
              height: ghost.height,
              transform: `rotate(${ghost.rotate}deg)`,
            }}
          />
        ))}
      </div>

      {/* The one thing that actually says what is happening, in the skin's own
          loader so the board matches the rest of the app while it waits. */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface-raised/90 px-3 py-1.5 shadow-sm backdrop-blur">
          <SkinLoader size="sm" />
          <span className="text-2xs uppercase tracking-[0.16em] text-content-faint">
            {t('notes.opening')}
          </span>
        </span>
      </div>
    </div>
  );
};

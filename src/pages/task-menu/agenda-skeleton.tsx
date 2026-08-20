import { Skeleton } from '@/shared/ui';

/**
 * The agenda's own shape, drawn before the agenda arrives.
 *
 * A centred spinner told the user only that something was happening. This tells
 * them *what* is coming and, more usefully, reserves the room it will need — so
 * the header and the filter row above it do not jump downwards the moment the
 * first day bucket lands.
 *
 * Two buckets rather than a screenful: enough to read as "a list of days is
 * loading", few enough that a fast response never flashes a wall of grey.
 */
export const AgendaSkeleton = () => (
  <div className="space-y-6 sm:space-y-8" aria-hidden>
    {[0, 1].map((bucket) => (
      <section key={bucket} className="space-y-2.5">
        <header className="flex items-center gap-3 py-1.5 sm:py-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <span className="h-px flex-1 bg-edge" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </header>

        <ol className="space-y-2 sm:space-y-2.5">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex gap-2 sm:gap-3">
              <div className="flex w-10 shrink-0 justify-end pt-4 sm:w-14">
                <Skeleton className="h-3 w-8 rounded-md" />
              </div>
              <Skeleton className="h-[4.5rem] flex-1 rounded-2xl" />
            </li>
          ))}
        </ol>
      </section>
    ))}
  </div>
);

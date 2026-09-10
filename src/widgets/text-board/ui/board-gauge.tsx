import { useBoardUsage } from '@/entities/document/model/queries';
import { formatBytesCeiling, formatBytesUsed, usageFraction } from '@/features/billing/lib/format';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * How full this board is, said before somebody fills it.
 *
 * ## Why the Documents tab needed one at all
 *
 * Because the ceiling it is drawing was, until this existed, invisible until
 * it was hit — and it is the one ceiling in the product that is not about the
 * person looking at it.
 *
 * A **project** board has a single allowance covering every page on it, sized
 * by the **project owner's** plan: 1 GB on Baron, 500 MB on Startup, 100 MB on
 * Free. Every member writes into the same one, and a member's own plan changes
 * nothing — a Baron colleague does not raise a free owner's board, and a free
 * colleague does not lower a Baron owner's. That is a genuinely surprising rule
 * to meet for the first time in a refused upload, which is exactly how it was
 * being met.
 *
 * A **personal** desk is the one board where the allowance really is per
 * person, because there is only one person on it.
 *
 * ## Why the number comes from the server
 *
 * `GET /documents/board-usage` answers with the ceiling *and* the total, both
 * resolved by the same code that refuses the upload — see `QuotaService`. The
 * obvious alternative, drawing it from `billing/me`, would be the reader's own
 * plan, which on a project board is the wrong plan roughly whenever it matters.
 *
 * ## Why it draws nothing rather than something reassuring
 *
 * Until the answer arrives, and on a plan with no byte ceiling at all. A gauge
 * that renders empty while loading makes an established board look empty for a
 * moment, and a full bar with no ceiling behind it is a bar that can never
 * move. Both are worse than a gap in a toolbar.
 */
export const BoardGauge = ({ projectId }: { projectId?: string }) => {
  const t = useT();
  const { data } = useBoardUsage(projectId);

  const fraction = data ? usageFraction(data.usedBytes, data.limitBytes) : null;
  if (!data || fraction === null || data.limitBytes === null) return null;

  const limit = formatBytesCeiling(data.limitBytes);
  const isFull = fraction >= 1;
  /* The last tenth, which is the point at which the number stops being
     background information and becomes something to act on. */
  const isTight = fraction >= 0.9;

  return (
    <span
      className="ml-auto flex items-center gap-2"
      title={
        isFull
          ? t('doc.storageFull')
          : t(projectId ? 'doc.storageHintProject' : 'doc.storageHintPersonal', { limit })
      }
    >
      {/*
        A track and a fill, not a `<progress>`.

        `progress` is painted by the operating system and ignores every token in
        this file — it would be the one control on thirteen skins that looks the
        same on all of them. The ARIA role carries the same semantics to a
        screen reader, and `aria-label` says which board it is about, because
        "72%" on its own is not an answer to anything.
      */}
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-label={t('doc.storageLabel')}
        className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken sm:block"
      >
        <span
          className={cn(
            'block h-full rounded-full transition-[width] duration-300 ease-studio',
            isFull ? 'bg-danger' : isTight ? 'bg-warning' : 'bg-brand',
          )}
          /* A width, not a `scaleX`: the track is 64px and a scaled fill would
             round its right edge from a 64px pill rather than from its own,
             which reads as a bar that never quite empties. */
          style={{ width: `${Math.max(fraction * 100, fraction > 0 ? 6 : 0)}%` }}
        />
      </span>

      <span
        className={cn(
          'whitespace-nowrap text-2xs tabular-nums',
          isFull ? 'text-danger' : isTight ? 'text-warning' : 'text-content-faint',
        )}
      >
        {t('doc.storage', { used: formatBytesUsed(data.usedBytes), limit })}
      </span>
    </span>
  );
};

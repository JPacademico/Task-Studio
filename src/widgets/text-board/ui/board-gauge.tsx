import { useBoardUsage } from '@/entities/document/model/queries';
import { formatBytesCeiling, formatBytesUsed, usageFraction } from '@/features/billing/lib/format';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/** How full this board is, said before somebody fills it. */
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
      {/* A track and a fill, not a `<progress>`. `progress` is painted by the operating system
          and ignores every token in this file. */}
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
          /* A width, not a `scaleX`: the track is 64px and a scaled fill would round its right edge
             from a 64px pill rather than from its own. */
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

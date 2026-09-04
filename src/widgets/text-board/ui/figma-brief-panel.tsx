import { AlertTriangle, ListChecks, Route, Sparkles, X } from 'lucide-react';

import type { FigmaBrief } from '@/entities/document/model/types';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, SkinLoader } from '@/shared/ui';

interface FigmaBriefPanelProps {
  brief: FigmaBrief | null;
  isLoading: boolean;
  onClose: () => void;
  /** Saves the brief as a page of its own. Absent while it is still loading. */
  onSave?: () => void;
  isSaving?: boolean;
}

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="space-y-1.5">
    <h4 className="flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
      <span aria-hidden className="text-content-faint">
        {icon}
      </span>
      {title}
    </h4>
    {children}
  </section>
);

/**
 * The assistant's reading of a design, beside the design.
 *
 * ## Why it is a panel and not a page
 *
 * Because it is an *opinion about* the file rather than part of it, and the
 * distinction is the whole reason this is safe to offer at all. The text board
 * used to hand imported documents to a model and let the result replace the
 * page — a transcription sitting under the original's title, which is the
 * worst failure a document surface can have, and why that feature is gone.
 *
 * Nothing here touches the design. The brief arrives in a panel, it is
 * labelled as written from names rather than artwork, and it becomes a
 * document only if somebody presses save — at which point it is a *new* page
 * with its own title, next to the design rather than over it.
 *
 * ## Why the disclaimer is in the panel rather than in a tooltip
 *
 * "The assistant never sees the artwork" is not a caveat, it is the thing that
 * tells a reader how much to trust what is in front of them: a claim about a
 * flow inferred from frame names is worth something, and a claim about a
 * colour would be invented. Somebody deciding whether to act on this needs it
 * at the same moment they read it.
 */
export const FigmaBriefPanel = ({
  brief,
  isLoading,
  onClose,
  onSave,
  isSaving = false,
}: FigmaBriefPanelProps) => {
  const t = useT();

  return (
    <aside
      className={cn(
        'ui-card flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-edge',
        'bg-surface-raised p-3',
      )}
      aria-label={t('figma.briefTitle')}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/12 text-brand"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h3 className="flex-1 truncate text-sm font-semibold tracking-tight">
          {t('figma.briefTitle')}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label={t('common.close')}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </header>

      {isLoading && (
        <div className="grid flex-1 place-items-center">
          <SkinLoader label={t('figma.briefLoading')} />
        </div>
      )}

      {!isLoading && !brief && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertTriangle className="h-5 w-5 text-content-faint" />
          <p className="text-xs text-content-muted">{t('figma.briefFailed')}</p>
        </div>
      )}

      {!isLoading && brief && (
        <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <p className="text-xs leading-relaxed text-content">{brief.summary}</p>

          {brief.flows.length > 0 && (
            <Section title={t('figma.briefFlows')} icon={<Route className="h-3 w-3" />}>
              <ul className="space-y-1.5">
                {brief.flows.map((flow) => (
                  <li key={flow.name} className="rounded-lg bg-surface-sunken/60 px-2.5 py-1.5">
                    <p className="text-2xs font-semibold">{flow.name}</p>
                    <p className="text-3xs leading-relaxed text-content-muted">{flow.detail}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {brief.tasks.length > 0 && (
            <Section title={t('figma.briefTasks')} icon={<ListChecks className="h-3 w-3" />}>
              <ul className="space-y-1">
                {brief.tasks.map((task) => (
                  <li
                    key={task}
                    className="flex gap-1.5 text-3xs leading-relaxed text-content-muted"
                  >
                    <span aria-hidden className="text-content-faint">
                      ·
                    </span>
                    {task}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {brief.gaps.length > 0 && (
            <Section title={t('figma.briefGaps')} icon={<AlertTriangle className="h-3 w-3" />}>
              <ul className="space-y-1">
                {brief.gaps.map((gap) => (
                  <li
                    key={gap}
                    className="flex gap-1.5 text-3xs leading-relaxed text-content-muted"
                  >
                    <span aria-hidden className="text-content-faint">
                      ·
                    </span>
                    {gap}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="border-t border-edge pt-2 text-3xs leading-relaxed text-content-faint">
            {t('figma.briefDisclaimer')}
          </p>
        </div>
      )}

      {!isLoading && brief && onSave && (
        <Button size="sm" variant="secondary" onClick={onSave} isLoading={isSaving}>
          {t('figma.briefSave')}
        </Button>
      )}
    </aside>
  );
};

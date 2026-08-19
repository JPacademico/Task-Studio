import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, TriangleAlert, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { Badge, Button, EmptyState, Section } from '@/shared/ui';
import { aiApi, type AiSuggestion } from '../api/ai.api';
import { useT } from '@/shared/i18n';

const SEVERITY_STYLE = {
  info: 'border-edge',
  warning: 'border-warning/50 bg-warning/[0.06]',
  critical: 'border-danger/50 bg-danger/[0.06]',
} as const;

/**
 * Gemini-backed workflow review for a project. Free-tier friendly: analysis is
 * explicitly triggered, never polled, and every result is stored so re-reading
 * it costs nothing.
 */
export const AiPanel = ({ projectId }: { projectId: string }) => {
  const t = useT();
  const queryClient = useQueryClient();
  const [latest, setLatest] = useState<AiSuggestion | null>(null);

  const { data: status } = useQuery({
    queryKey: queryKeys.ai.status,
    queryFn: aiApi.status,
    staleTime: 5 * 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: queryKeys.ai.history(projectId),
    queryFn: () => aiApi.history(projectId),
  });

  const analyze = useMutation({
    mutationFn: () => aiApi.analyzeProject(projectId),
    onSuccess: (suggestion) => {
      setLatest(suggestion);
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.history(projectId) });
      toast.success(t('ai.reviewReady'));
    },
    onError: (error) => toast.error(errorMessage(error, t('ai.unavailable'))),
  });

  const shown = latest ?? history.find((entry) => entry.kind === 'WORKFLOW') ?? null;

  if (status && !status.enabled) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title={t('ai.notConfigured')}
        description={t('ai.notConfiguredBody')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title={t('ai.workflowReview')}
        description={t('ai.workflowReviewBody')}
        action={
          <Button size="sm" onClick={() => analyze.mutate()} isLoading={analyze.isPending}>
            <Wand2 className="h-3.5 w-3.5" />
            {t(shown ? 'ai.reanalyse' : 'ai.analyse')}
          </Button>
        }
      >
        {!shown && !analyze.isPending && (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={t('ai.noAnalysis')}
            description={t('ai.noAnalysisBody')}
          />
        )}

        {analyze.isPending && (
          <div className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-4">
            <p className="text-sm font-medium">{t('ai.reading')}</p>
            <p className="text-xs text-content-muted">
              {t('ai.readingBody')}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {shown && !analyze.isPending && (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="gpu space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge>{shown.model}</Badge>
                <span className="text-[11px] text-content-faint">
                  {t('ai.generated')} {formatRelative(shown.createdAt)}
                </span>
              </div>

              <ul className="space-y-2.5">
                {(shown.result.insights ?? []).map((insight) => (
                  <li
                    key={insight.title}
                    className={cn(
                      'space-y-1 rounded-2xl border bg-surface-raised p-4',
                      SEVERITY_STYLE[insight.severity] ?? SEVERITY_STYLE.info,
                    )}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {insight.severity !== 'info' && (
                        <TriangleAlert
                          className={cn(
                            'h-3.5 w-3.5',
                            insight.severity === 'critical' ? 'text-danger' : 'text-warning',
                          )}
                        />
                      )}
                      {insight.title}
                    </p>
                    <p className="text-xs leading-relaxed text-content-muted">{insight.detail}</p>
                  </li>
                ))}
              </ul>

              {(shown.result.nextSteps ?? []).length > 0 && (
                <div className="rounded-2xl border border-edge bg-surface-sunken p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-faint">
                    {t('ai.nextSteps')}
                  </p>
                  <ol className="space-y-1.5">
                    {(shown.result.nextSteps ?? []).map((step, index) => (
                      <li key={step} className="flex gap-2 text-xs text-content-muted">
                        <span className="font-semibold text-brand">{index + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </div>
  );
};

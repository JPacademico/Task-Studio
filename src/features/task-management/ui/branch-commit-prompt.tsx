import { ExternalLink, GitBranch } from 'lucide-react';

import { useCommitPrompt } from '@/entities/task/model/commit-prompt.store';
import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** "You finished the task — do you want to open the branch?". */
export const BranchCommitPrompt = () => {
  const t = useT();
  const offer = useCommitPrompt((state) => state.offer);
  const dismiss = useCommitPrompt((state) => state.dismiss);

  return (
    <Modal
      isOpen={offer !== null}
      onClose={dismiss}
      title={offer ? t('task.commitTitle', { branch: offer.branch }) : ''}
      className="max-w-md"
    >
      {offer && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-content-muted">{t('task.commitBody')}</p>

          <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface-sunken/60 px-2.5 py-2">
            <GitBranch aria-hidden className="h-3.5 w-3.5 shrink-0 text-content-faint" />
            <span className="min-w-0 flex-1 truncate font-mono text-2xs">{offer.branch}</span>
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={dismiss}>
              {t('task.commitLater')}
            </Button>
            {/* A real link rather than a button that calls `window.open`. It is a navigation to
                another site, so it should behave like one: middle-click opens a tab. */}
            <a
              href={offer.branchUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={dismiss}
              className="ui-btn inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-medium text-brand-contrast transition-opacity hover:opacity-90"
            >
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              {t('task.commitOpen')}
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
};

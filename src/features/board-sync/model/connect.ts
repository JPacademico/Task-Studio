import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { boardsApi } from '@/entities/integration/api/boards.api';
import type { BoardProvider } from '@/entities/integration/model/types';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate, type TranslationKey } from '@/shared/i18n';
import { toast } from '@/shared/lib/toast';

/** Remembers that the account was connected from the import dialog, so it reopens there. */
const RESUME_KEY = 'task-studio:board-resume';

const OUTCOMES: Record<string, { key: TranslationKey; ok: boolean; provider: BoardProvider }> = {
  'trello-connected': { key: 'boards.trelloConnected', ok: true, provider: 'TRELLO' },
  'jira-connected': { key: 'boards.jiraConnected', ok: true, provider: 'JIRA' },
  'jira-failed': { key: 'boards.connectFailed', ok: false, provider: 'JIRA' },
  'jira-nosite': { key: 'boards.jiraNoSite', ok: false, provider: 'JIRA' },
};

/** Sends the browser to Trello or Atlassian; it comes back to the current page. */
export const connectBoardAccount = async (
  provider: BoardProvider,
  options: { resumeImport?: boolean } = {},
): Promise<void> => {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  try {
    const url = await boardsApi.connectUrl(provider, returnTo);
    try {
      if (options.resumeImport) sessionStorage.setItem(RESUME_KEY, provider);
    } catch {
      // Without storage the dialog simply does not reopen by itself.
    }
    window.location.assign(url);
  } catch (error) {
    toast.error(errorMessage(error, translate('boards.connectFailed')));
  }
};

/** Reads `?boards=` after a provider redirect: toasts the outcome and resumes an import. */
export const useBoardConnectOutcome = (onResumeImport: (provider: BoardProvider) => void) => {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const outcome = params.get('boards');

  useEffect(() => {
    if (!outcome) return;
    const entry = OUTCOMES[outcome];

    const next = new URLSearchParams(params);
    next.delete('boards');
    setParams(next, { replace: true });
    if (!entry) return;

    if (entry.ok) toast.success(translate(entry.key));
    else toast.error(translate(entry.key));
    void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.boards });

    let resume: string | null = null;
    try {
      resume = sessionStorage.getItem(RESUME_KEY);
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      resume = null;
    }
    if (entry.ok && resume === entry.provider) onResumeImport(entry.provider);
  }, [onResumeImport, outcome, params, queryClient, setParams]);
};

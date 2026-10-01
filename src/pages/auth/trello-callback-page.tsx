import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { boardsApi } from '@/entities/integration/api/boards.api';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { toast } from '@/shared/lib/toast';
import { useT } from '@/shared/i18n';
import { Button, SkinLoader } from '@/shared/ui';
import { AuthShell } from './auth-shell';

/** Trello sends the token back in the URL fragment; this hands it to the API and returns. */
const TrelloCallbackPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = fragment.get('token');
    const state = params.get('state');
    // The token must not linger in the address bar or the history entry.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token || !state) {
      toast(t('boards.trelloCancelled'));
      navigate('/settings', { replace: true });
      return;
    }

    void (async () => {
      try {
        const { returnTo } = await boardsApi.saveTrelloToken(token, state);
        await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.boards });
        // The shell reads `?boards=` to toast and to reopen an import that was in progress.
        navigate(`${returnTo}${returnTo.includes('?') ? '&' : '?'}boards=trello-connected`, { replace: true });
      } catch (cause) {
        setError(errorMessage(cause, t('boards.connectFailed')));
      }
    })();
  }, [navigate, params, queryClient, t]);

  return (
    <AuthShell
      title={t(error ? 'boards.connectFailedTitle' : 'boards.trelloFinishing')}
      subtitle={error ?? t('boards.trelloFinishingBody')}
    >
      {error ? (
        <Button className="w-full" size="lg" onClick={() => navigate('/settings', { replace: true })}>
          {t('boards.backToSettings')}
        </Button>
      ) : (
        <div className="flex justify-center py-6">
          <SkinLoader />
        </div>
      )}
    </AuthShell>
  );
};

export default TrelloCallbackPage;

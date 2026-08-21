import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { Button, SkinLoader } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { AuthShell } from './auth-shell';

/**
 * Where a provider sign-in lands.
 *
 * The API has already done everything that matters — checked the state, traded
 * the code with the provider, found or created the account, issued the tokens —
 * and parked the result under a single-use code. All this screen does is hand
 * that code back over POST and start the session with what comes out. It is
 * deliberately the only place in the app that reads `?code`, and it does so
 * exactly once: `exchangedRef` guards against React's development double-invoke
 * of effects, which would otherwise spend the code on the first run and show
 * "that sign-in has expired" on the second.
 *
 * There is no automatic retry. A code is single-use, so a retry cannot succeed;
 * the honest response to a failure is to say so and offer the way back to the
 * sign-in screen.
 */
export const OAuthCallbackPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const startSession = useSessionStore((state) => state.startSession);

  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const providerError = params.get('error');
    const code = params.get('code');

    // The user pressed "Cancel" on the provider's consent screen. Not a
    // failure — just a change of mind — so it goes quietly back to the form.
    if (providerError === 'cancelled') {
      navigate('/login', { replace: true });
      return;
    }

    if (providerError) {
      setError(providerError);
      return;
    }

    if (!code) {
      setError(t('auth.oauth.missingCode'));
      return;
    }

    void (async () => {
      try {
        const session = await authApi.exchangeOAuthCode(code);
        startSession(session);
        navigate('/', { replace: true });
        toast.success(
          t('auth.signIn.welcomeBack', { name: session.user.displayName.split(' ')[0] }),
        );
      } catch (cause) {
        setError(errorMessage(cause, t('auth.oauth.failed')));
      }
    })();
  }, [navigate, params, startSession, t]);

  return (
    <AuthShell
      title={t(error ? 'auth.oauth.failedTitle' : 'auth.oauth.finishing')}
      subtitle={error ?? t('auth.oauth.finishingBody')}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">{t('auth.signUp.haveAccount')}</span>
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t('auth.signUp.signIn')}
          </Link>
        </div>
      }
    >
      {error ? (
        <Button className="w-full" size="lg" onClick={() => navigate('/login', { replace: true })}>
          {t('auth.oauth.backToSignIn')}
        </Button>
      ) : (
        <div className="flex justify-center py-6">
          <SkinLoader />
        </div>
      )}
    </AuthShell>
  );
};

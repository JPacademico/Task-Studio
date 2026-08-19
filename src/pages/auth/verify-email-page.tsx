import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, MailCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { Button, Input, Spinner } from '@/shared/ui';
import { AuthShell } from './auth-shell';
import { useT } from '@/shared/i18n';

type Phase = 'idle' | 'verifying' | 'verified' | 'failed';

/**
 * Two jobs in one screen: consume a `?token=` link, or tell a freshly signed-up
 * user to go check their inbox (with a resend escape hatch).
 */
export const VerifyEmailPage = () => {
  const t = useT();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { startSession, pendingEmail, user } = useSessionStore();
  const [phase, setPhase] = useState<Phase>(token ? 'verifying' : 'idle');
  const [email, setEmail] = useState(pendingEmail ?? user?.email ?? '');
  const attemptedRef = useRef(false);

  const verify = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (session) => {
      startSession(session);
      setPhase('verified');
      toast.success(t('auth.verify.welcome'));
      // Brief pause so the success state is actually readable.
      setTimeout(() => navigate('/', { replace: true }), 1200);
    },
    onError: (error) => {
      setPhase('failed');
      toast.error(errorMessage(error, t('auth.verify.linkInvalid')));
    },
  });

  const resend = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: (response) => toast.success(response.message),
    onError: (error) => toast.error(errorMessage(error)),
  });

  useEffect(() => {
    // StrictMode double-invokes effects; a single-use token must be spent once.
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    verify.mutate(token);
  }, [token, verify]);

  if (phase === 'verifying') {
    return (
      <AuthShell title={t('auth.verify.confirmingTitle')} subtitle={t('auth.verify.oneMoment')}>
        <div className="flex items-center gap-3 py-4">
          <Spinner />
          <span className="text-sm text-content-muted">{t('auth.verify.validating')}</span>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'verified') {
    return (
      <AuthShell title={t('auth.verify.youAreIn')} subtitle={t('auth.verify.redirecting')}>
        <div className="flex items-center gap-3 py-4 text-positive">
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-sm font-medium">{t('auth.verify.confirmedTitle')}</span>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t(phase === 'failed' ? 'auth.verify.expiredTitle' : 'auth.verify.pendingTitle')}
      subtitle={
        t(
          phase === 'failed'
            ? 'auth.verify.expiredSubtitle'
            : 'auth.verify.pendingSubtitle',
        )
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">{t('auth.verify.wrongAddress')}</span>
          <Link to="/signup" className="font-medium text-brand hover:underline">
            {t('auth.verify.startOver')}
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-edge bg-surface-sunken p-3.5">
          {phase === 'failed' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          ) : (
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          )}
          <p className="text-xs leading-relaxed text-content-muted">
            {email ? (
              <>
                {t('auth.verify.sentTo')}{' '}
                <span className="font-medium text-content">{email}</span>
                {t('auth.verify.spamNote')}
              </>
            ) : (
              t('auth.verify.enterAddress')
            )}
          </p>
        </div>

        <Input
          label={t('auth.email')}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('auth.emailPlaceholder')}
        />

        <Button
          className="w-full"
          size="lg"
          variant="secondary"
          isLoading={resend.isPending}
          disabled={!email.includes('@')}
          onClick={() => resend.mutate(email)}
        >
          {t('auth.verify.resend')}
        </Button>

        <Link
          to="/login"
          className="block text-center text-xs text-content-muted hover:text-brand hover:underline"
        >
          {t('auth.backToSignIn')}
        </Link>
      </div>
    </AuthShell>
  );
};

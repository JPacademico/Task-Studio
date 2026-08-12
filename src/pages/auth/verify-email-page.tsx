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

type Phase = 'idle' | 'verifying' | 'verified' | 'failed';

/**
 * Two jobs in one screen: consume a `?token=` link, or tell a freshly signed-up
 * user to go check their inbox (with a resend escape hatch).
 */
export const VerifyEmailPage = () => {
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
      toast.success('Email confirmed. Welcome to Task Studio.');
      // Brief pause so the success state is actually readable.
      setTimeout(() => navigate('/', { replace: true }), 1200);
    },
    onError: (error) => {
      setPhase('failed');
      toast.error(errorMessage(error, 'This confirmation link is no longer valid.'));
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
      <AuthShell title="Confirming your email" subtitle="One moment…">
        <div className="flex items-center gap-3 py-4">
          <Spinner />
          <span className="text-sm text-content-muted">Validating your link</span>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'verified') {
    return (
      <AuthShell title="You are in" subtitle="Redirecting to your dashboard.">
        <div className="flex items-center gap-3 py-4 text-positive">
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-sm font-medium">Email confirmed</span>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={phase === 'failed' ? 'Link expired' : 'Confirm your email'}
      subtitle={
        phase === 'failed'
          ? 'Confirmation links last 24 hours. Send yourself a fresh one.'
          : 'We sent a confirmation link. Open it and your workspace unlocks.'
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">Wrong address?</span>
          <Link to="/signup" className="font-medium text-brand hover:underline">
            Start over
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
                Sent to <span className="font-medium text-content">{email}</span>. Check the
                spam folder if it has not arrived.
              </>
            ) : (
              'Enter your address below and we will send the link again.'
            )}
          </p>
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <Button
          className="w-full"
          size="lg"
          variant="secondary"
          isLoading={resend.isPending}
          disabled={!email.includes('@')}
          onClick={() => resend.mutate(email)}
        >
          Resend confirmation link
        </Button>

        <Link
          to="/login"
          className="block text-center text-xs text-content-muted hover:text-brand hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
};

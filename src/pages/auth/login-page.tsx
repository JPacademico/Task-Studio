import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { OAuthButtons } from '@/features/auth/ui/oauth-buttons';
import { ensureApiAwake, errorMessage, isApiWarm } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { useT } from '@/shared/i18n';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const LoginPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession, setPendingEmail } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /**
   * Signing in, with the container's nap accounted for.
   *
   * The mutation is not `authApi.login` any more, and the extra line in front
   * of it is the whole fix. A sign-in POST is the *first* request of a session
   * by definition, so it is the request most likely to land on a sleeping
   * free-tier container — and a login page that has been sitting open in a tab
   * for half an hour is the worst version of that, because the wake `AuthShell`
   * fires on mount has long since expired.
   *
   * What happened then was not a clean wait. The POST went out against a
   * container that had to cold-boot Node and reconnect a suspended Postgres
   * before it could even look at the password, and it either took most of a
   * minute or fell off the client's own ceiling and was reported as "the
   * server is unreachable" — which is the one thing it demonstrably was not.
   *
   * So the boot happens first, on `/health`: unauthenticated, cheap, and safe
   * to attempt three times because it changes nothing. Only then does the
   * password go anywhere, by which point the request it is racing is a warm
   * one. A `false` here is not a reason to stop — the probe may have been
   * blocked while the API is perfectly reachable — so the sign-in goes ahead
   * either way and whatever it hits produces the real error message.
   */
  const [isWaking, setIsWaking] = useState(false);

  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!isApiWarm()) {
        setIsWaking(true);
        try {
          await ensureApiAwake();
        } finally {
          setIsWaking(false);
        }
      }

      return authApi.login(credentials);
    },
    onSuccess: (session) => {
      startSession(session);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
      toast.success(t('auth.signIn.welcomeBack', { name: session.user.displayName.split(' ')[0] }));
    },
    onError: (error) => {
      const message = errorMessage(error, t('auth.signIn.failed'));
      // Unconfirmed accounts get routed to the resend screen instead of a dead end.
      if (message.toLowerCase().includes('confirm your email')) {
        setPendingEmail(email);
        navigate('/verify-email');
      }
      toast.error(message);
    },
  });

  return (
    <AuthShell
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">{t('auth.signIn.noAccount')}</span>
          <Link to="/signup" className="font-medium text-brand hover:underline">
            {t('auth.signIn.createOne')}
          </Link>
        </div>
      }
    >
      <form
        className="space-y-4"
        aria-busy={login.isPending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate({ email, password });
        }}
      >
        <Input
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(clampText(event.target.value, TEXT_LIMITS.email))}
          maxLength={TEXT_LIMITS.email}
          placeholder={t('auth.emailPlaceholder')}
        />

        <Input
          label={t('auth.password')}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(clampText(event.target.value, TEXT_LIMITS.password))}
          maxLength={TEXT_LIMITS.password}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-content-muted hover:text-brand hover:underline"
          >
            {t('auth.signIn.forgot')}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={login.isPending}>
          {t(isWaking ? 'auth.signIn.waking' : 'auth.signIn.submit')}
        </Button>

        {/*
          Said only while it is true, and only on the slow path.

          A cold start is tens of seconds of a button that looks stuck. The
          spinner alone reads as "something is wrong with my password"; this
          says which of the two waits this is, and it goes quiet the moment the
          container answers.

          Always rendered, empty, rather than mounted when the wait begins.
          Two reasons and both are real: a live region announces a *change* to
          text that was already there, so one that appears at the same moment as
          its content is frequently announced by nothing at all — and a
          paragraph appearing under the button pushed the OAuth row down by a
          line, mid-wait, on the one screen where nothing should move while
          somebody is watching it. `min-h` holds the line either way.
        */}
        <p
          role="status"
          aria-live="polite"
          className="min-h-[1rem] text-center text-2xs leading-relaxed text-content-faint"
        >
          {isWaking ? t('auth.signIn.wakingHint') : ''}
        </p>
      </form>

      {/* Renders nothing at all unless the API has provider keys — see
          `OAuthButtons`. Outside the form, because these are navigations and
          an <a> inside a <form> that submits on Enter is a trap. */}
      <OAuthButtons intent="signIn" className="mt-5" />
    </AuthShell>
  );
};

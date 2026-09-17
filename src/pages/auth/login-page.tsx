import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { HumanCheck } from '@/features/auth/ui/human-check';
import { OAuthButtons } from '@/features/auth/ui/oauth-buttons';
import { ensureApiAwake, errorMessage, isApiWarm } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { useT } from '@/shared/i18n';
import { Button, Input, PasswordInput } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const LoginPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession, setPendingEmail } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /*
   * The Turnstile token, when this deployment asks for one.
   *
   * Undefined is the normal state on a deployment with no keys, and also the
   * state a moment after the token expires — `HumanCheck` clears it. The
   * request carries it either way and the API decides: a deployment without the
   * secret ignores it, one with it refuses a request that has none.
   */
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();

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
    mutationFn: async (credentials: {
      email: string;
      password: string;
      captchaToken?: string;
    }) => {
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
          login.mutate({ email, password, captchaToken });
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

        <PasswordInput
          label={t('auth.password')}
          name="password"
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

        {/* Renders nothing unless the API reports Turnstile keys. Above the
            button so the challenge, on the rare occasion it is interactive, is
            not below the thing it blocks. */}
        <HumanCheck onToken={setCaptchaToken} />

        {/*
          The button and its status line are one block, not two rows.

          They used to be siblings in the form's `space-y-4`, and the status
          also held a `min-h` line open whether or not it had anything to say.
          On the ordinary path — which is every sign-in that is not a cold start
          — that bought a permanently empty sixteen-pixel paragraph plus its own
          sixteen-pixel gap, and the "or" row sat fifty-odd pixels below the
          button with nothing in between.

          Wrapping them removes the gap between the two, and the margin below is
          now conditional, so the empty state takes no room at all.
        */}
        <div>
          <Button type="submit" className="w-full" size="lg" isLoading={login.isPending}>
            {t(isWaking ? 'auth.signIn.waking' : 'auth.signIn.submit')}
          </Button>

          {/*
            Said only while it is true, and only on the slow path.

            A cold start is tens of seconds of a button that looks stuck. The
            spinner alone reads as "something is wrong with my password"; this
            says which of the two waits this is, and it goes quiet the moment
            the container answers.

            Still always rendered rather than mounted when the wait begins: a
            live region announces a *change* to text that was already there, and
            one that appears at the same moment as its content is frequently
            announced by nothing at all.

            What it no longer does is hold the line open while empty. The layout
            therefore moves once, downwards, at the start of a cold start — the
            one moment the reader is waiting rather than reading, and a cheaper
            price than a permanent hole under the button on every other visit.
          */}
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'text-center text-2xs leading-relaxed text-content-faint',
              isWaking && 'mt-2',
            )}
          >
            {isWaking ? t('auth.signIn.wakingHint') : ''}
          </p>
        </div>
      </form>

      {/* Renders nothing at all unless the API has provider keys — see
          `OAuthButtons`. Outside the form, because these are navigations and
          an <a> inside a <form> that submits on Enter is a trap. */}
      <OAuthButtons intent="signIn" className="mt-4" />
    </AuthShell>
  );
};

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { HumanCheck } from '@/features/auth/ui/human-check';
import { OAuthButtons } from '@/features/auth/ui/oauth-buttons';
import { TermsNotice } from '@/features/auth/ui/terms-consent';
import { ensureApiAwake, errorMessage, isApiWarm } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { afterSignIn } from '@/shared/lib/pending-invite';
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

  // The Turnstile token, when this deployment asks for one. Undefined is the normal state on a
  // deployment with no keys, and also the state a moment after the token expires.
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();

  /**
   * Signing in, with the container's nap accounted for. The mutation is not `authApi.login` any
   * more, and the extra line in front of it is the whole fix.
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
      navigate(afterSignIn(from), { replace: true });
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

        {/* Renders nothing unless the API reports Turnstile keys. Above the button so the
            challenge, on the rare occasion it is interactive, is not below the thing it blocks. */}
        <HumanCheck onToken={setCaptchaToken} />

        {/* The button and its status line are one block, not two rows. They used to be siblings
            in the form's `space-y-4`. */}
        <div>
          <Button type="submit" className="w-full" size="lg" isLoading={login.isPending}>
            {t(isWaking ? 'auth.signIn.waking' : 'auth.signIn.submit')}
          </Button>

          {/* Said only while it is true, and only on the slow path. A cold start is tens of
              seconds of a button that looks stuck. */}
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

      {/* Renders nothing at all unless the API has provider keys — see `OAuthButtons`. */}
      <OAuthButtons intent="signIn" className="mt-4" />
      <TermsNotice className="mt-4" />
    </AuthShell>
  );
};

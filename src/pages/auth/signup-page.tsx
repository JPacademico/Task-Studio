import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { HumanCheck } from '@/features/auth/ui/human-check';
import { OAuthButtons } from '@/features/auth/ui/oauth-buttons';
import { errorMessage } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { useT } from '@/shared/i18n';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const SignupPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const setPendingEmail = useSessionStore((state) => state.setPendingEmail);

  /*
   * The address the footer's "Start free" field carried over, if there was one.
   *
   * Read once into the initial state rather than synced: this is a handoff, not
   * a binding — somebody who then edits the field must not have it snap back on
   * the next render, and clearing the box must not be undone by the URL.
   */
  const [searchParams] = useSearchParams();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      setPendingEmail(email);
      navigate('/verify-email');
      toast.success(t('auth.signUp.checkInbox'));
    },
    onError: (error) => toast.error(errorMessage(error, t('auth.signUp.failed'))),
  });

  const passwordIsValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);

  return (
    <AuthShell
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">{t('auth.signUp.haveAccount')}</span>
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t('auth.signUp.signIn')}
          </Link>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!passwordIsValid) return;
          register.mutate({ displayName, email, password, captchaToken });
        }}
      >
        <Input
          label={t('auth.signUp.displayName')}
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          value={displayName}
          onChange={(event) =>
            setDisplayName(clampText(event.target.value, TEXT_LIMITS.displayName))
          }
          maxLength={TEXT_LIMITS.displayName}
          placeholder={t('auth.signUp.namePlaceholder')}
        />

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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(clampText(event.target.value, TEXT_LIMITS.password))}
          maxLength={TEXT_LIMITS.password}
          placeholder={t('auth.signUp.passwordHint')}
          hint={t('auth.reset.hint')}
          error={password.length > 0 && !passwordIsValid ? t('auth.signUp.passwordError') : undefined}
        />

        {/* Nothing at all unless the API reports Turnstile keys. */}
        <HumanCheck onToken={setCaptchaToken} />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={register.isPending}
          disabled={!passwordIsValid}
        >
          {t('auth.signUp.submit')}
        </Button>

        <p className="text-center text-2xs leading-relaxed text-content-faint">
          {t('auth.signUp.confirmNote')}
        </p>
      </form>

      {/* The short way in: a provider has already confirmed the address, so
          signing up this way skips the inbox round trip entirely. */}
      <OAuthButtons intent="signUp" className="mt-5" />
    </AuthShell>
  );
};

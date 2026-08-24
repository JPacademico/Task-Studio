import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
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

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          register.mutate({ displayName, email, password });
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={register.isPending}
          disabled={!passwordIsValid}
        >
          {t('auth.signUp.submit')}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-content-faint">
          {t('auth.signUp.confirmNote')}
        </p>
      </form>

      {/* The short way in: a provider has already confirmed the address, so
          signing up this way skips the inbox round trip entirely. */}
      <OAuthButtons intent="signUp" className="mt-5" />
    </AuthShell>
  );
};

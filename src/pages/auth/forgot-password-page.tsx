import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';
import { useT } from '@/shared/i18n';

export const ForgotPasswordPage = () => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const request = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (response) => {
      setSent(true);
      toast.success(response.message);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <AuthShell
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-xl border border-edge bg-surface-sunken p-4 text-sm leading-relaxed text-content-muted">
          {t('auth.forgot.sent')} <span className="font-medium text-content">{email}</span>
          {t('auth.forgot.sentSuffix')}
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            request.mutate(email);
          }}
        >
          <Input
            label={t('auth.email')}
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('auth.emailPlaceholder')}
          />
          <Button type="submit" className="w-full" size="lg" isLoading={request.isPending}>
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
};

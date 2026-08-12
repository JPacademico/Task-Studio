import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const ForgotPasswordPage = () => {
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
      title="Reset your password"
      subtitle="We email a single-use link that expires in one hour."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-xl border border-edge bg-surface-sunken p-4 text-sm leading-relaxed text-content-muted">
          If an account exists for <span className="font-medium text-content">{email}</span>, the
          reset link is on its way.
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
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" className="w-full" size="lg" isLoading={request.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
};

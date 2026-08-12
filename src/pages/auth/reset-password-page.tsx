import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (response) => {
      toast.success(response.message);
      navigate('/login', { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const isValid =
    password.length >= 8 &&
    /\d/.test(password) &&
    /[a-zA-Z]/.test(password) &&
    password === confirmation;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Every existing session is signed out once you save."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {token ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) reset.mutate({ token, password });
          }}
        >
          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="8+ characters, with at least one letter and one number."
          />
          <Input
            label="Confirm password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            error={
              confirmation.length > 0 && confirmation !== password
                ? 'Passwords do not match.'
                : undefined
            }
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={reset.isPending}
            disabled={!isValid}
          >
            Save new password
          </Button>
        </form>
      ) : (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          This page needs a reset link. Request a new one from the sign-in screen.
        </p>
      )}
    </AuthShell>
  );
};

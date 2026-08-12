import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession, setPendingEmail } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      startSession(session);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
      toast.success(`Welcome back, ${session.user.displayName.split(' ')[0]}.`);
    },
    onError: (error) => {
      const message = errorMessage(error, 'Could not sign you in.');
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
      title="Sign in"
      subtitle="Your projects, tasks and boards are waiting."
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">No account yet?</span>
          <Link to="/signup" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate({ email, password });
        }}
      >
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-content-muted hover:text-brand hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
};

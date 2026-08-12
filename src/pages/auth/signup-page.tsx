import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export const SignupPage = () => {
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
      toast.success('Check your inbox to confirm your address.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the account.')),
  });

  const passwordIsValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);

  return (
    <AuthShell
      title="Create your studio"
      subtitle="One account for personal notes and team projects."
      footer={
        <div className="flex items-center justify-between">
          <span className="text-content-muted">Already have an account?</span>
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
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
          label="Display name"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Ana Ribeiro"
        />

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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          hint="8+ characters, with at least one letter and one number."
          error={password.length > 0 && !passwordIsValid ? 'Add a letter and a number.' : undefined}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={register.isPending}
          disabled={!passwordIsValid}
        >
          Create account
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-content-faint">
          We send one confirmation email. Accounts stay locked until the address is
          verified.
        </p>
      </form>
    </AuthShell>
  );
};

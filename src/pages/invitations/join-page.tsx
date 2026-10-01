import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Users, XCircle } from 'lucide-react';

import { inviteLinkApi } from '@/entities/project/api/invite-link.api';
import { useInviteLinkPreview } from '@/entities/project/model/invite-link.queries';
import { useSessionStore } from '@/features/auth/model/session.store';
import { AuthShell } from '@/pages/auth/auth-shell';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { forgetInvite, readInviteToken, rememberInvite } from '@/shared/lib/pending-invite';
import { toast } from '@/shared/lib/toast';
import { useT } from '@/shared/i18n';
import { Avatar, Button, PageLoader } from '@/shared/ui';

/** Where a project invite link lands: signed-out visitors go to sign-up, members straight in. */
const JoinPage = () => {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = readInviteToken(useParams().token) ?? '';
  const { status, user } = useSessionStore();
  const preview = useInviteLinkPreview(token);
  const [isJoining, setIsJoining] = useState(false);

  const signedIn = status === 'authenticated' && Boolean(user?.isVerified);

  // Kept through sign-up, the confirmation email and any OAuth round trip.
  useEffect(() => {
    if (token && !signedIn && status !== 'loading') rememberInvite(token);
  }, [signedIn, status, token]);

  if (!token || preview.isError) {
    return (
      <AuthShell title={t('join.invalidTitle')} subtitle={errorMessage(preview.error, t('join.invalidBody'))}>
        <div className="flex items-center gap-3 py-2 text-danger">
          <XCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{t('join.askAgain')}</span>
        </div>
        <Link to="/" className="mt-4 block text-center text-xs text-content-muted hover:text-brand hover:underline">
          {t('join.goHome')}
        </Link>
      </AuthShell>
    );
  }

  if (status === 'loading' || preview.isLoading || !preview.data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <PageLoader label={t('join.loading')} />
      </div>
    );
  }

  if (status === 'unauthenticated') return <Navigate to={`/signup?invite=${token}`} replace />;
  if (!user?.isVerified) return <Navigate to="/verify-email" replace />;

  const { project, invitedBy, memberCount } = preview.data;

  const join = async () => {
    setIsJoining(true);
    try {
      const result = await inviteLinkApi.join(token);
      forgetInvite();
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      if (!result.alreadyMember) toast.success(t('join.joined', { name: project.name }));
      navigate(`/projects/${result.projectId}`, { replace: true });
    } catch (error) {
      setIsJoining(false);
      toast.error(errorMessage(error, t('join.failed')));
    }
  };

  return (
    <AuthShell
      title={t('join.title', { name: project.name })}
      subtitle={t('join.subtitle', { name: invitedBy.displayName })}
      footer={
        <button
          type="button"
          onClick={() => {
            forgetInvite();
            navigate('/', { replace: true });
          }}
          className="w-full text-center text-content-muted hover:text-brand hover:underline"
        >
          {t('join.notNow')}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-surface-sunken p-3.5">
          <span aria-hidden className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-2xs leading-relaxed text-content-muted">
                {project.description}
              </p>
            )}
            <p className="mt-1.5 flex items-center gap-1.5 text-3xs text-content-faint">
              <Users className="h-3 w-3" />
              {t('join.members', { count: memberCount })}
            </p>
          </div>
          <Avatar name={invitedBy.displayName} src={invitedBy.avatarUrl} size="sm" />
        </div>

        <p className="text-2xs leading-relaxed text-content-muted">
          {t('join.signedInAs', { email: user.email })}
        </p>

        <Button className="w-full" size="lg" onClick={() => void join()} isLoading={isJoining}>
          {t('join.accept')}
        </Button>
      </div>
    </AuthShell>
  );
};

export default JoinPage;

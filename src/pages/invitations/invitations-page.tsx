import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Check, FolderKanban, Mail, X } from 'lucide-react';

import {
  useMyOrganizationInvitations,
  useRespondToOrganizationInvitation,
} from '@/entities/organization/model/queries';
import { useMyInvitations, useRespondToInvitation } from '@/entities/project/model/queries';
import type { UserSummary } from '@/entities/user/model/types';
import { formatRelative } from '@/shared/lib/dates';
import { Avatar, Badge, Button, EmptyState, PageLoader } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * The two kinds of invitation, flattened into one thing the list can draw.
 *
 * They arrive from two endpoints and are answered on two routes — different
 * tables, different ids, and a merged endpoint would leave the accept route
 * guessing which table an id came from. But they are the same *event* from the
 * reader's side ("somebody asked me to join something"), so they belong in one
 * list, sorted together, in the order they arrived.
 *
 * `kind` is what routes the reply back to the right mutation, and it is also
 * what the row uses to say which of the two this is — the difference matters:
 * accepting a project invitation gives you work, accepting a company one gives
 * you a view of it.
 */
interface UnifiedInvitation {
  kind: 'project' | 'organization';
  id: string;
  name: string;
  color: string;
  role: string;
  message: string | null;
  createdAt: string;
  invitedBy: UserSummary;
}

/** Newest first, which is how an inbox is read. */
const byNewest = (a: UnifiedInvitation, b: UnifiedInvitation): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** Invitations addressed to the current user — to projects and to companies. */
const InvitationsPage = () => {
  const t = useT();

  const { data: projectInvitations = [], isLoading } = useMyInvitations();
  const { data: organizationInvitations = [], isLoading: organizationsLoading } =
    useMyOrganizationInvitations();

  const respondToProject = useRespondToInvitation();
  const respondToOrganization = useRespondToOrganizationInvitation();

  const invitations: UnifiedInvitation[] = [
    ...projectInvitations.map((invitation) => ({
      kind: 'project' as const,
      id: invitation.id,
      name: invitation.project.name,
      color: invitation.project.color,
      role: invitation.role,
      message: invitation.message,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    })),
    ...organizationInvitations.map((invitation) => ({
      kind: 'organization' as const,
      id: invitation.id,
      name: invitation.organization.name,
      color: invitation.organization.color,
      role: invitation.role,
      message: invitation.message,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    })),
  ].sort(byNewest);

  const respond = (invitation: UnifiedInvitation, accept: boolean) => {
    if (invitation.kind === 'project') {
      respondToProject.mutate({ invitationId: invitation.id, accept });
    } else {
      respondToOrganization.mutate({ invitationId: invitation.id, accept });
    }
  };

  const isPending = (invitation: UnifiedInvitation): boolean =>
    invitation.kind === 'project'
      ? respondToProject.isPending &&
        respondToProject.variables?.invitationId === invitation.id
      : respondToOrganization.isPending &&
        respondToOrganization.variables?.invitationId === invitation.id;

  if (isLoading || organizationsLoading) return <PageLoader label={t('invites.checking')} />;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-content-faint">
          {t('invites.title')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{t('invites.heading')}</h1>
        <p className="text-sm text-content-muted">{t('invites.subtitle')}</p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title={t('invites.none')}
          description={t('invites.noneBody')}
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {invitations.map((invitation) => (
              <motion.li
                key={`${invitation.kind}:${invitation.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="gpu overflow-hidden rounded-2xl border border-edge bg-surface-raised"
              >
                <div
                  aria-hidden
                  className="h-1.5 w-full"
                  style={{ backgroundColor: invitation.color }}
                />

                <div className="flex flex-wrap items-center gap-4 p-4">
                  <Avatar
                    name={invitation.invitedBy.displayName}
                    src={invitation.invitedBy.avatarUrl}
                    size="md"
                  />

                  <div className="min-w-[220px] flex-1 space-y-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
                      {invitation.kind === 'organization' ? (
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-content-faint" />
                      ) : (
                        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-content-faint" />
                      )}
                      {invitation.name}
                    </p>
                    <p className="text-xs text-content-muted">
                      {invitation.invitedBy.displayName} {t('invites.invitedYou')}{' '}
                      {formatRelative(invitation.createdAt)}
                    </p>
                    {/* What accepting actually gets you. Worth spelling out for
                        a company: joining one does not put anybody on a project
                        inside it, and "why can't I see the work" is the
                        question that follows if nobody says so. */}
                    <p className="text-[11px] text-content-faint">
                      {t(
                        invitation.kind === 'organization'
                          ? 'invites.orgExplain'
                          : 'invites.projectExplain',
                      )}
                    </p>
                    {invitation.message && (
                      <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs italic text-content-muted">
                        “{invitation.message}”
                      </p>
                    )}
                  </div>

                  <Badge>{invitation.role.toLowerCase()}</Badge>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => respond(invitation, true)}
                      isLoading={isPending(invitation)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('invites.accept')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => respond(invitation, false)}>
                      <X className="h-3.5 w-3.5" />
                      {t('invites.decline')}
                    </Button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default InvitationsPage;

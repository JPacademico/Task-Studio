import { AnimatePresence, motion } from 'framer-motion';
import { Check, Mail, X } from 'lucide-react';

import { useMyInvitations, useRespondToInvitation } from '@/entities/project/model/queries';
import { formatRelative } from '@/shared/lib/dates';
import { Avatar, Badge, Button, EmptyState, PageLoader } from '@/shared/ui';

/** Roster invitations addressed to the current user. */
const InvitationsPage = () => {
  const { data: invitations = [], isLoading } = useMyInvitations();
  const respond = useRespondToInvitation();

  if (isLoading) return <PageLoader label="Checking invitations" />;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-content-faint">Invitations</p>
        <h1 className="text-2xl font-semibold tracking-tight">Project invitations</h1>
        <p className="text-sm text-content-muted">
          Accepting adds you to the roster and unlocks the project's board and chat.
        </p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="No pending invitations"
          description="When someone invites you to a project, it shows up here and as a notification."
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {invitations.map((invitation) => (
              <motion.li
                key={invitation.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="gpu overflow-hidden rounded-2xl border border-edge bg-surface-raised"
              >
                <div
                  aria-hidden
                  className="h-1.5 w-full"
                  style={{ backgroundColor: invitation.project.color }}
                />

                <div className="flex flex-wrap items-center gap-4 p-4">
                  <Avatar
                    name={invitation.invitedBy.displayName}
                    src={invitation.invitedBy.avatarUrl}
                    size="md"
                  />

                  <div className="min-w-[220px] flex-1 space-y-1">
                    <p className="text-sm font-semibold leading-snug">
                      {invitation.project.name}
                    </p>
                    <p className="text-xs text-content-muted">
                      {invitation.invitedBy.displayName} invited you{' '}
                      {formatRelative(invitation.createdAt)}
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
                      onClick={() =>
                        respond.mutate({ invitationId: invitation.id, accept: true })
                      }
                      isLoading={respond.isPending && respond.variables?.invitationId === invitation.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        respond.mutate({ invitationId: invitation.id, accept: false })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
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

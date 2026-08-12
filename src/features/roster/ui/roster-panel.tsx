import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Mail, Shield, UserMinus, UserPlus } from 'lucide-react';

import {
  useInviteMember,
  usePendingInvitations,
  useRemoveMember,
  useRoster,
} from '@/entities/project/model/queries';
import type { ProjectRole } from '@/entities/project/model/types';
import { userApi } from '@/entities/user/api/user.api';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { Avatar, Badge, Button, EmptyState, Input, Modal, Section } from '@/shared/ui';

interface RosterPanelProps {
  projectId: string;
  canManage: boolean;
}

const ROLE_ICON: Record<ProjectRole, ReactNode> = {
  OWNER: <Crown className="h-3 w-3 text-warning" />,
  ADMIN: <Shield className="h-3 w-3 text-brand" />,
  MEMBER: <></>,
};

/**
 * Roster management: who is on the project, plus invitations. Invites target
 * registered, verified accounts only — that is a domain rule, not a UI choice.
 */
export const RosterPanel = ({ projectId, canManage }: RosterPanelProps) => {
  const currentUser = useCurrentUser();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<ProjectRole>('MEMBER');

  const { data: members = [] } = useRoster(projectId);
  const { data: pending = [] } = usePendingInvitations(canManage ? projectId : undefined);
  const invite = useInviteMember(projectId);
  const removeMember = useRemoveMember(projectId);

  // Debounce so typing an email does not fire a query per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 320);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ['users', 'search', debounced],
    queryFn: () => userApi.search(debounced),
    enabled: isInviteOpen && debounced.length >= 2,
  });

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const invitable = candidates.filter((candidate) => !memberIds.has(candidate.id));

  return (
    <div className="space-y-6">
      <Section
        title="Roster"
        description={`${members.length} member(s) on this project.`}
        action={
          canManage && (
            <Button size="sm" variant="secondary" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </Button>
          )
        }
      >
        <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {member.displayName}
                  {ROLE_ICON[member.role]}
                  {member.id === currentUser?.id && (
                    <span className="text-[10px] text-content-faint">(you)</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-content-faint">{member.email}</p>
              </div>

              <Badge>{member.role.toLowerCase()}</Badge>

              {canManage && member.role !== 'OWNER' && member.id !== currentUser?.id && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${member.displayName}`}
                  onClick={() => removeMember.mutate(member.id)}
                  className="text-content-faint hover:text-danger"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {canManage && pending.length > 0 && (
        <Section title="Pending invitations">
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-dashed border-edge">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-content-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{invitation.recipient.displayName}</p>
                  <p className="text-[11px] text-content-faint">
                    invited {formatRelative(invitation.createdAt)}
                  </p>
                </div>
                <Badge>{invitation.role.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite to the roster"
        description="Search registered users by name, or paste an exact email address."
      >
        <div className="space-y-4">
          <Input
            label="Search"
            name="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            autoFocus
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">Role</p>
            <div className="flex gap-1.5">
              {(['MEMBER', 'ADMIN'] as ProjectRole[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    role === option
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-edge text-content-muted hover:text-content',
                  )}
                >
                  {option.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {debounced.length >= 2 && (
            <div className="space-y-2">
              {isFetching && <p className="text-xs text-content-faint">Searching…</p>}

              {!isFetching && invitable.length === 0 && (
                <EmptyState
                  className="px-4 py-6"
                  title="No match"
                  description="Only verified Task Studio accounts can be invited."
                />
              )}

              {invitable.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-xl border border-edge px-3 py-2.5"
                >
                  <Avatar name={candidate.displayName} src={candidate.avatarUrl} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{candidate.displayName}</p>
                    <p className="truncate text-[11px] text-content-faint">{candidate.email}</p>
                  </div>
                  <Button
                    size="sm"
                    isLoading={invite.isPending}
                    onClick={() =>
                      invite.mutate(
                        { userId: candidate.id, role },
                        { onSuccess: () => setIsInviteOpen(false) },
                      )
                    }
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          )}

          {search.includes('@') && invitable.length === 0 && (
            <Button
              variant="secondary"
              className="w-full"
              isLoading={invite.isPending}
              onClick={() =>
                invite.mutate(
                  { email: search.trim().toLowerCase(), role },
                  { onSuccess: () => setIsInviteOpen(false) },
                )
              }
            >
              Invite {search.trim()}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

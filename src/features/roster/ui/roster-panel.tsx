import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Mail, Shield, UserMinus, UserPlus } from 'lucide-react';

import {
  useInviteMember,
  usePendingInvitations,
  useRemoveMember,
  useUpdateMemberRole,
  useRoster,
} from '@/entities/project/model/queries';
import type { ProjectRole } from '@/entities/project/model/types';
import { userApi } from '@/entities/user/api/user.api';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { formatRelative } from '@/shared/lib/dates';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Section,
  Select,
  Skeleton,
  Spinner,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface RosterPanelProps {
  projectId: string;
  /** Owner or admin: may invite, remove and change roles. */
  canManage: boolean;
  /**
   * Whether the reader is the project's owner.
   *
   * Only the owner may change an *admin's* role — otherwise any admin could
   * demote every other one and be the last one standing, which is a takeover
   * performed with a dropdown. The API refuses it either way; this is what
   * stops the control being offered in the first place. See
   * `RosterService.updateMemberRole`.
   */
  isOwner?: boolean;
}

/** The two roles that can be handed out. OWNER moves by transfer, not here. */
const ASSIGNABLE_ROLES: ProjectRole[] = ['ADMIN', 'MEMBER'];

const ROLE_ICON: Record<ProjectRole, ReactNode> = {
  OWNER: <Crown className="h-3 w-3 text-warning" />,
  ADMIN: <Shield className="h-3 w-3 text-brand" />,
  MEMBER: <></>,
};

/**
 * The roster while it is still arriving.
 *
 * Laid out as the rows it is standing in for — avatar, two lines of text, a
 * role chip — rather than a spinner in the middle of an empty panel, so the
 * tab does not visibly reflow when the real names land on top of it.
 *
 * Four rows because that is roughly a small team; a taller placeholder would
 * promise more people than most projects have and then collapse.
 */
const RosterSkeleton = () => (
  <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
    {Array.from({ length: 4 }, (_, index) => (
      <li key={index} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32 max-w-[60%]" />
          <Skeleton className="h-2.5 w-44 max-w-[80%]" />
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      </li>
    ))}
  </ul>
);

/**
 * Roster management: who is on the project, plus invitations. Invites target
 * registered, verified accounts only — that is a domain rule, not a UI choice.
 */
export const RosterPanel = ({ projectId, canManage, isOwner = false }: RosterPanelProps) => {
  const t = useT();
  const currentUser = useCurrentUser();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<ProjectRole>('MEMBER');

  const { data: members = [], isPending: isRosterPending } = useRoster(projectId);
  const { data: pending = [] } = usePendingInvitations(canManage ? projectId : undefined);
  const invite = useInviteMember(projectId);
  const removeMember = useRemoveMember(projectId);
  const updateRole = useUpdateMemberRole(projectId);

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
        title={t('roster.title')}
        description={
          isRosterPending
            ? t('roster.loadingMembers')
            : t('roster.memberCount', { count: members.length })
        }
        action={
          canManage && (
            <Button size="sm" variant="secondary" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              {t('roster.invite')}
            </Button>
          )
        }
      >
        {isRosterPending ? (
          <RosterSkeleton />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            {members.map((member) => {
              /*
               * The row is already gone from the cache by the time this runs —
               * removal is optimistic (see `useRemoveMember`). This only covers
               * the sliver where the mutation has been queued and React has not
               * re-rendered yet, and the retry a rollback would produce.
               */
              const isRemoving =
                removeMember.isPending && removeMember.variables === member.id;

              return (
                <li
                  key={member.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-opacity duration-150',
                    isRemoving && 'pointer-events-none opacity-50',
                  )}
                >
                  <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {member.displayName}
                      {ROLE_ICON[member.role]}
                      {member.id === currentUser?.id && (
                        <span className="text-[10px] text-content-faint">{t('roster.you')}</span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-content-faint">{member.email}</p>
                  </div>

                  {/*
                    The role is editable in place for an owner or admin.

                    It used to be a read-only badge, which meant the only way to
                    correct a role was to remove the person and invite them
                    again — and removal takes their task assignments with it
                    (see the API's `RosterService.removeMember`). A dropdown is
                    a great deal less destructive than that.

                    The owner's own row stays a badge: ownership moves through a
                    transfer, not through here. An admin also cannot change
                    another admin — the API refuses it, so the control is not
                    offered. See `RosterService.updateMemberRole`.
                  */}
                  {canManage &&
                  member.role !== 'OWNER' &&
                  member.id !== currentUser?.id &&
                  (isOwner || member.role !== 'ADMIN') ? (
                    <Select
                      value={member.role}
                      onChange={(role) => updateRole.mutate({ memberId: member.id, role })}
                      options={ASSIGNABLE_ROLES.map((option) => ({
                        value: option,
                        label: t(option === 'ADMIN' ? 'roster.roleAdmin' : 'roster.roleMember'),
                        hint: t(
                          option === 'ADMIN' ? 'roster.roleAdminHint' : 'roster.roleMemberHint',
                        ),
                      }))}
                    />
                  ) : (
                    <Badge>{member.role.toLowerCase()}</Badge>
                  )}

                  {canManage && member.role !== 'OWNER' && member.id !== currentUser?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('roster.remove', { name: member.displayName })}
                      onClick={() => removeMember.mutate(member.id)}
                      disabled={isRemoving}
                      className="text-content-faint hover:text-danger"
                    >
                      {isRemoving ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <UserMinus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {canManage && pending.length > 0 && (
        <Section title={t('roster.pending')}>
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-dashed border-edge">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-content-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{invitation.recipient.displayName}</p>
                  <p className="text-[11px] text-content-faint">
                    {t('roster.invitedRelative')} {formatRelative(invitation.createdAt)}
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
        title={t('roster.inviteTitle')}
        description={t('roster.inviteSubtitle')}
      >
        <div className="space-y-4">
          <Input
            label={t('roster.search')}
            name="search"
            value={search}
            onChange={(event) => setSearch(clampText(event.target.value, TEXT_LIMITS.search))}
            placeholder={t('roster.searchPlaceholder')}
            maxLength={TEXT_LIMITS.search}
            autoFocus
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">{t('roster.role')}</p>
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
              {isFetching && <p className="text-xs text-content-faint">{t('roster.searching')}</p>}

              {!isFetching && invitable.length === 0 && (
                <EmptyState
                  className="px-4 py-6"
                  title={t('roster.noMatch')}
                  description={t('roster.noMatchBody')}
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
                    {t('roster.invite')}
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

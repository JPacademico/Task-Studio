import { useMemo, useState } from 'react';
import { Flag, Mail, UserMinus, UserPlus, X } from 'lucide-react';

import { projectPermissionsOf } from '@/entities/project/model/permissions';
import {
  useInviteMember,
  usePendingInvitations,
  useRemoveMember,
  useRevokeProjectInvitation,
  useUpdateMemberRole,
  useRoster,
} from '@/entities/project/model/queries';
import type {
  ProjectPermission,
  ProjectRole,
  RosterMember,
} from '@/entities/project/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import {
  PersonSearch,
  targetKey,
  targetPayload,
  type InviteTarget,
} from '@/features/invite-picker/ui/person-search';
import {
  isCustomAccess,
  PROJECT_ACCESS,
  type GrantableRole,
} from '@/features/member-access/model/catalogs';
import { AccessChip } from '@/features/member-access/ui/access-chip';
import { AccessPicker, type AccessValue } from '@/features/member-access/ui/access-picker';
import { MemberAccessDialog } from '@/features/member-access/ui/member-access-dialog';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { Avatar, Button, Modal, Section, Skeleton, Spinner } from '@/shared/ui';
import { ReportUserDialog } from './report-user-dialog';
import { useT, type Translate } from '@/shared/i18n';

interface RosterPanelProps {
  projectId: string;
  /** The reader's own role and permissions, from the project detail. */
  myRole: ProjectRole;
  myPermissions?: ProjectPermission[];
}

/**
 * The roster while it is still arriving. Laid out as the rows it is standing in for — avatar, two
 * lines of text, a role chip — rather than a spinner in the middle of an empty panel.
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

/** The permissions spelled out, for a chip's tooltip. */
const describe = (t: Translate, permissions: readonly ProjectPermission[]): string =>
  permissions.map((permission) => t(PROJECT_ACCESS.label[permission])).join(', ');

/**
 * Who is on the project, and inviting more. Invites target registered, verified accounts only, and
 * every control here is gated by the reader's own permissions — the same ones the API enforces.
 */
export const RosterPanel = ({ projectId, myRole, myPermissions }: RosterPanelProps) => {
  const t = useT();
  const currentUser = useCurrentUser();

  const mine = useMemo(() => projectPermissionsOf(myRole, myPermissions), [myRole, myPermissions]);
  const isOwner = myRole === 'OWNER';
  const canInvite = mine.includes('INVITE_MEMBERS');
  const canManageAccess = mine.includes('MANAGE_ADMINS');
  const canRemove = mine.includes('REMOVE_MEMBERS');

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [access, setAccess] = useState<AccessValue<ProjectPermission>>({
    role: 'MEMBER',
    permissions: [],
  });
  const [inFlight, setInFlight] = useState<string | null>(null);
  const [editing, setEditing] = useState<RosterMember | null>(null);

  const { data: members = [], isPending: isRosterPending } = useRoster(projectId);

  // Who is being reported, and who already has been. `reported` is local to this mounted panel
  // rather than fetched per row.
  const [reporting, setReporting] = useState<{ id: string; displayName: string } | null>(null);
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  const { data: pending = [] } = usePendingInvitations(canInvite ? projectId : undefined);
  const invite = useInviteMember(projectId);
  const revoke = useRevokeProjectInvitation(projectId);
  const removeMember = useRemoveMember(projectId);
  const updateAccess = useUpdateMemberRole(projectId);

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const pendingIds = useMemo(
    () => new Set(pending.map((invitation) => invitation.recipient.id)),
    [pending],
  );

  /** Only the owner reaches another admin, and nobody reaches the owner or themselves. */
  const isReachable = (member: RosterMember) =>
    member.role !== 'OWNER' &&
    member.id !== currentUser?.id &&
    (isOwner || member.role !== 'ADMIN');

  const openInvite = () => {
    setAccess({ role: 'MEMBER', permissions: [] });
    setIsInviteOpen(true);
  };

  const sendInvite = (target: InviteTarget) => {
    setInFlight(targetKey(target));
    invite.mutate(
      {
        ...targetPayload(target),
        role: canManageAccess ? access.role : 'MEMBER',
        ...(canManageAccess ? { permissions: access.permissions } : {}),
      },
      // Stays open for the next person; the row turns into "invited" once the list refetches.
      { onSettled: () => setInFlight(null) },
    );
  };

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
          canInvite && (
            <Button size="sm" variant="secondary" onClick={openInvite}>
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
              // The row is already gone from the cache by the time this runs — removal is
              // optimistic (see `useRemoveMember`).
              const isRemoving =
                removeMember.isPending && removeMember.variables === member.id;
              const held = projectPermissionsOf(member.role, member.permissions);
              const reachable = isReachable(member);

              return (
                <li
                  key={member.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3 transition-opacity duration-150',
                    isRemoving && 'pointer-events-none opacity-50',
                  )}
                >
                  <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {member.displayName}
                      {member.id === currentUser?.id && (
                        <span className="text-3xs text-content-faint">{t('roster.you')}</span>
                      )}
                    </p>
                    <p className="truncate text-2xs text-content-faint">{member.email}</p>
                  </div>

                  <AccessChip
                    role={member.role}
                    count={held.length}
                    total={PROJECT_ACCESS.all.length}
                    isCustom={isCustomAccess(PROJECT_ACCESS, member.role, member.permissions)}
                    detail={held.length > 0 ? describe(t, held) : undefined}
                    onEdit={canManageAccess && reachable ? () => setEditing(member) : undefined}
                  />

                  {/* Reporting is offered to *everybody* about everybody else, which is the
                      point of having it. */}
                  {member.id !== currentUser?.id &&
                    (reported.has(member.id) ? (
                      <span
                        title={t('report.alreadyHint')}
                        className="inline-flex h-8 w-8 items-center justify-center text-content-faint"
                      >
                        <Flag aria-hidden className="h-3.5 w-3.5" />
                        <span className="sr-only">{t('report.already')}</span>
                      </span>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t('report.action')}
                        title={t('report.action')}
                        onClick={() =>
                          setReporting({ id: member.id, displayName: member.displayName })
                        }
                        className="text-content-faint hover:text-danger"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    ))}

                  {canRemove && reachable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('roster.remove', { name: member.displayName })}
                      title={t('roster.remove', { name: member.displayName })}
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

      {canInvite && pending.length > 0 && (
        <Section title={t('roster.pending')}>
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-dashed border-edge">
            {pending.map((invitation) => {
              const granted = projectPermissionsOf(invitation.role, invitation.permissions);

              return (
                <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-content-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{invitation.recipient.displayName}</p>
                    <p className="text-2xs text-content-faint">
                      {t('roster.invitedRelative')} {formatRelative(invitation.createdAt)}
                    </p>
                  </div>
                  <AccessChip
                    role={invitation.role}
                    count={granted.length}
                    total={PROJECT_ACCESS.all.length}
                    detail={granted.length > 0 ? describe(t, granted) : undefined}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('roster.revokeInvite')}
                    title={t('roster.revokeInvite')}
                    onClick={() => revoke.mutate(invitation.id)}
                    disabled={revoke.isPending && revoke.variables === invitation.id}
                    className="text-content-faint hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={t('roster.inviteTitle')}
        description={t('roster.inviteSubtitle')}
        flat
        footer={
          <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="space-y-5">
          {/* Chosen first, so every "Invite" below sends it. Anything beyond a plain membership
              needs "manage admins"; without it the dialog says so instead of a locked form. */}
          {canManageAccess ? (
            <AccessPicker
              catalog={PROJECT_ACCESS}
              value={access}
              onChange={setAccess}
              grantable={mine}
              collapsible
            />
          ) : (
            <p className="rounded-xl border border-edge bg-surface-sunken/50 px-3 py-2.5 text-2xs leading-relaxed text-content-muted">
              {t('access.memberOnly')}
            </p>
          )}

          <PersonSearch
            isOpen={isInviteOpen}
            onInvite={sendInvite}
            excludeIds={memberIds}
            pendingIds={pendingIds}
            pendingTarget={inFlight}
          />
        </div>
      </Modal>

      {editing && (
        <MemberAccessDialog
          isOpen
          onClose={() => setEditing(null)}
          catalog={PROJECT_ACCESS}
          member={{
            displayName: editing.displayName,
            role: editing.role as GrantableRole,
            permissions:
              editing.permissions ?? [...PROJECT_ACCESS.presets[editing.role as GrantableRole]],
          }}
          grantable={mine}
          isSaving={updateAccess.isPending}
          onSave={(next) =>
            updateAccess.mutate(
              { memberId: editing.id, role: next.role, permissions: next.permissions },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      )}

      {/* One dialog for the whole list, opened with whoever the row named. A dialog per row
          would mount twenty of them to use at most one. */}
      {reporting && (
        <ReportUserDialog
          isOpen
          onClose={() => setReporting(null)}
          subject={reporting}
          projectId={projectId}
          onReported={() =>
            setReported((current) => new Set(current).add(reporting.id))
          }
        />
      )}
    </div>
  );
};

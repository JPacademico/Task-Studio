import { useMemo, useState } from 'react';
import { Mail, Pencil, UserPlus, X } from 'lucide-react';

import { organizationPermissionsOf } from '@/entities/organization/model/permissions';
import {
  useInviteToOrganization,
  useOrganizationInvitations,
  useOrganizationMembers,
  useRemoveOrganizationMember,
  useRevokeOrganizationInvitation,
  useUpdateOrganizationMember,
} from '@/entities/organization/model/queries';
import type {
  Organization,
  OrganizationMember,
  OrgPermission,
} from '@/entities/organization/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import {
  PersonSearch,
  targetKey,
  targetPayload,
  type InviteTarget,
} from '@/features/invite-picker/ui/person-search';
import {
  isCustomAccess,
  ORGANIZATION_ACCESS,
  type GrantableRole,
} from '@/features/member-access/model/catalogs';
import { AccessChip } from '@/features/member-access/ui/access-chip';
import { AccessPicker, type AccessValue } from '@/features/member-access/ui/access-picker';
import { MemberAccessDialog } from '@/features/member-access/ui/member-access-dialog';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { formatRelative } from '@/shared/lib/dates';
import {
  Avatar,
  Button,
  EmptyState,
  Input,
  Modal,
  Section,
  Skeleton,
} from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

/** The permissions spelled out, for a chip's tooltip. */
const describe = (t: Translate, permissions: readonly OrgPermission[]): string =>
  permissions.map((permission) => t(ORGANIZATION_ACCESS.label[permission])).join(', ');

interface MemberRowProps {
  organizationId: string;
  member: OrganizationMember;
  /** The reader's effective permissions. */
  mine: OrgPermission[];
  isOwner: boolean;
  isSelf: boolean;
  onEditAccess: (member: OrganizationMember) => void;
  t: Translate;
}

const MemberRow = ({
  organizationId,
  member,
  mine,
  isOwner,
  isSelf,
  onEditAccess,
  t,
}: MemberRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [jobTitle, setJobTitle] = useState(member.jobTitle ?? '');

  const update = useUpdateOrganizationMember(organizationId);
  const remove = useRemoveOrganizationMember(organizationId);

  // The owner's row is read-only in both directions, and only the owner reaches another admin.
  const isCompanyOwner = member.role === 'OWNER';
  const reachable = !isCompanyOwner && !isSelf && (isOwner || member.role !== 'ADMIN');
  const held = organizationPermissionsOf(member.role, member.permissions);
  const canEditTitle = mine.includes('INVITE_MEMBERS');

  const saveTitle = () => {
    setIsEditing(false);
    if (jobTitle.trim() === (member.jobTitle ?? '')) return;
    update.mutate({ memberId: member.id, jobTitle: jobTitle.trim() });
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />

      <div className="min-w-0 flex-1 leading-tight">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {member.displayName}
          {isSelf && (
            <span className="text-3xs uppercase tracking-wide text-content-faint">
              {t('org.you')}
            </span>
          )}
        </p>

        {isEditing ? (
          <Input
            name="jobTitle"
            value={jobTitle}
            onChange={(event) => setJobTitle(clampText(event.target.value, TEXT_LIMITS.jobTitle))}
            placeholder={t('org.jobTitlePlaceholder')}
            maxLength={TEXT_LIMITS.jobTitle}
            autoFocus
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveTitle();
              if (event.key === 'Escape') {
                setJobTitle(member.jobTitle ?? '');
                setIsEditing(false);
              }
            }}
            className="mt-1 h-7 py-0 text-xs"
          />
        ) : (
          <p className="truncate text-2xs text-content-faint">
            {member.jobTitle || t('org.noJobTitle')} · {t('org.joined')}{' '}
            {formatRelative(member.joinedAt)}
          </p>
        )}
      </div>

      <AccessChip
        role={member.role}
        count={held.length}
        total={ORGANIZATION_ACCESS.all.length}
        isCustom={isCustomAccess(ORGANIZATION_ACCESS, member.role, member.permissions)}
        detail={held.length > 0 ? describe(t, held) : undefined}
        onEdit={mine.includes('MANAGE_ADMINS') && reachable ? () => onEditAccess(member) : undefined}
      />

      {canEditTitle && !isEditing && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('org.editJobTitle')}
          title={t('org.editJobTitle')}
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Removing somebody, or leaving. Never the owner. */}
      {((mine.includes('REMOVE_MEMBERS') && reachable) || (isSelf && !isCompanyOwner)) && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t(isSelf ? 'org.leave' : 'org.removeMember')}
          title={t(isSelf ? 'org.leave' : 'org.removeMember')}
          onClick={() => remove.mutate(member.id)}
          className="hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
};

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  mine: OrgPermission[];
  memberIds: ReadonlySet<string>;
  pendingIds: ReadonlySet<string>;
  t: Translate;
}

/** Inviting by name or email, as the project roster does, with a job title and the access. */
const InviteDialog = ({
  isOpen,
  onClose,
  organizationId,
  mine,
  memberIds,
  pendingIds,
  t,
}: InviteDialogProps) => {
  const canManageAccess = mine.includes('MANAGE_ADMINS');
  const [access, setAccess] = useState<AccessValue<OrgPermission>>({
    role: 'MEMBER',
    permissions: [],
  });
  const [jobTitle, setJobTitle] = useState('');
  const [inFlight, setInFlight] = useState<string | null>(null);

  const invite = useInviteToOrganization(organizationId);

  const send = (target: InviteTarget) => {
    setInFlight(targetKey(target));
    invite.mutate(
      {
        ...targetPayload(target),
        role: canManageAccess ? access.role : 'MEMBER',
        ...(canManageAccess ? { permissions: access.permissions } : {}),
        jobTitle: jobTitle.trim() || undefined,
      },
      {
        // Stays open for the next person; the title is per person, so it is cleared.
        onSuccess: () => setJobTitle(''),
        onSettled: () => setInFlight(null),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('org.inviteTitle')}
      description={t('org.inviteSubtitle')}
      flat
      footer={
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Chosen first, so every "Invite" below sends it. */}
        {canManageAccess ? (
          <AccessPicker
            catalog={ORGANIZATION_ACCESS}
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

        <Input
          label={t('org.jobTitle')}
          name="jobTitle"
          value={jobTitle}
          onChange={(event) => setJobTitle(clampText(event.target.value, TEXT_LIMITS.jobTitle))}
          placeholder={t('org.jobTitlePlaceholder')}
          maxLength={TEXT_LIMITS.jobTitle}
        />

        <PersonSearch
          isOpen={isOpen}
          onInvite={send}
          excludeIds={memberIds}
          pendingIds={pendingIds}
          pendingTarget={inFlight}
        />
      </div>
    </Modal>
  );
};

interface OrganizationMembersPanelProps {
  organization: Organization;
}

/**
 * The company's staff list. It means you can see the company: its projects board, its numbers, its
 * calendar and this list.
 */
export const OrganizationMembersPanel = ({
  organization,
}: OrganizationMembersPanelProps) => {
  const t = useT();
  const currentUser = useCurrentUser();

  const mine = useMemo(
    () => organizationPermissionsOf(organization.myRole, organization.myPermissions),
    [organization.myRole, organization.myPermissions],
  );
  const canInvite = mine.includes('INVITE_MEMBERS');

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationMember | null>(null);

  const { data: members = [], isPending } = useOrganizationMembers(organization.id);
  // Needs "invite people" on the API, so it is not asked for by anybody else.
  const { data: invitations = [] } = useOrganizationInvitations(organization.id, canInvite);
  const revoke = useRevokeOrganizationInvitation(organization.id);
  const updateAccess = useUpdateOrganizationMember(organization.id);

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const pendingIds = useMemo(
    () => new Set(invitations.map((invitation) => invitation.recipient.id)),
    [invitations],
  );

  return (
    <div className="space-y-5">
      <Section
        title={t('org.staff')}
        description={t('org.headcount', { count: organization.memberCount })}
        action={
          canInvite && (
            <Button size="sm" variant="secondary" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              {t('org.invitePeople')}
            </Button>
          )
        }
      >
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                organizationId={organization.id}
                member={member}
                mine={mine}
                isOwner={organization.isOwner}
                isSelf={member.id === currentUser?.id}
                onEditAccess={setEditing}
                t={t}
              />
            ))}
          </ul>
        )}
      </Section>

      {canInvite && (
        <Section title={t('org.pendingInvites')}>
          {invitations.length === 0 ? (
            <EmptyState
              className="px-4 py-8"
              icon={<Mail className="h-5 w-5" />}
              title={t('org.noPendingInvites')}
              description={t('org.noPendingInvitesBody')}
            />
          ) : (
            <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
              {invitations.map((invitation) => {
                const granted = organizationPermissionsOf(invitation.role, invitation.permissions);

                return (
                  <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar
                      name={invitation.recipient.displayName}
                      src={invitation.recipient.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-sm font-medium">
                        {invitation.recipient.displayName}
                      </p>
                      <p className="truncate text-2xs text-content-faint">
                        {[
                          invitation.jobTitle,
                          t('org.invitedRelative', { when: formatRelative(invitation.createdAt) }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <AccessChip
                      role={invitation.role}
                      count={granted.length}
                      total={ORGANIZATION_ACCESS.all.length}
                      detail={granted.length > 0 ? describe(t, granted) : undefined}
                    />

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('org.revokeInvite')}
                      title={t('org.revokeInvite')}
                      onClick={() => revoke.mutate(invitation.id)}
                      className="hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      <InviteDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        organizationId={organization.id}
        mine={mine}
        memberIds={memberIds}
        pendingIds={pendingIds}
        t={t}
      />

      {editing && (
        <MemberAccessDialog
          isOpen
          onClose={() => setEditing(null)}
          catalog={ORGANIZATION_ACCESS}
          member={{
            displayName: editing.displayName,
            role: editing.role as GrantableRole,
            permissions:
              editing.permissions ?? [
                ...ORGANIZATION_ACCESS.presets[editing.role as GrantableRole],
              ],
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
    </div>
  );
};

import { useState } from 'react';
import { Mail, Pencil, UserPlus, X } from 'lucide-react';

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
  OrgRole,
} from '@/entities/organization/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  Section,
  Select,
  Skeleton,
} from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

/** The two roles that can be handed out. OWNER is transferred, not granted. */
const ASSIGNABLE_ROLES: OrgRole[] = ['ADMIN', 'MEMBER'];

interface MemberRowProps {
  organizationId: string;
  member: OrganizationMember;
  /** Owner: may change roles. Admin: may edit titles and remove people. */
  isOwner: boolean;
  canManage: boolean;
  isSelf: boolean;
  t: Translate;
}

const MemberRow = ({
  organizationId,
  member,
  isOwner,
  canManage,
  isSelf,
  t,
}: MemberRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [jobTitle, setJobTitle] = useState(member.jobTitle ?? '');

  const update = useUpdateOrganizationMember(organizationId);
  const remove = useRemoveOrganizationMember(organizationId);

  // The owner's row is read-only in both directions: their role cannot be
  // changed and they cannot be removed. Deleting the company is the only way
  // out, and the settings dialog is where that lives.
  const isCompanyOwner = member.role === 'OWNER';

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
            <span className="text-[10px] uppercase tracking-wide text-content-faint">
              {t('org.you')}
            </span>
          )}
        </p>

        {isEditing ? (
          <Input
            name="jobTitle"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder={t('org.jobTitlePlaceholder')}
            maxLength={280}
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
          <p className="truncate text-[11px] text-content-faint">
            {member.jobTitle || t('org.noJobTitle')} · {t('org.joined')}{' '}
            {formatRelative(member.joinedAt)}
          </p>
        )}
      </div>

      {isOwner && !isCompanyOwner ? (
        <Select
          value={member.role}
          onChange={(role) => update.mutate({ memberId: member.id, role })}
          options={ASSIGNABLE_ROLES.map((role) => ({
            value: role,
            label: t(role === 'ADMIN' ? 'org.roleAdmin' : 'org.roleMember'),
            hint: t(role === 'ADMIN' ? 'org.roleAdminHint' : 'org.roleMemberHint'),
          }))}
        />
      ) : (
        <Badge className={cn(isCompanyOwner && 'border-brand/40 text-brand')}>
          {t(
            isCompanyOwner
              ? 'org.roleOwner'
              : member.role === 'ADMIN'
                ? 'org.roleAdmin'
                : 'org.roleMember',
          )}
        </Badge>
      )}

      {canManage && !isEditing && (
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

      {/* Removing somebody, or leaving. Never the owner — see above. */}
      {!isCompanyOwner && (canManage || isSelf) && (
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

interface InviteFormProps {
  organizationId: string;
  t: Translate;
}

/**
 * Inviting one person, by address.
 *
 * Address only, and no directory search: this panel is for a company inviting
 * somebody it already employs or is about to, and the person doing the inviting
 * knows the address. The API refuses anybody without a confirmed account, which
 * is the same rule the project roster follows and for the same reason — an
 * invitation to an address nobody has claimed is a row that can never be
 * answered.
 */
const InviteForm = ({ organizationId, t }: InviteFormProps) => {
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<OrgRole>('MEMBER');

  const invite = useInviteToOrganization(organizationId);

  const canSubmit = /.+@.+\..+/.test(email.trim());

  const submit = () => {
    if (!canSubmit) return;
    invite.mutate(
      { email: email.trim(), role, jobTitle: jobTitle.trim() || undefined },
      {
        onSuccess: () => {
          setEmail('');
          setJobTitle('');
        },
      },
    );
  };

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-edge bg-surface-raised p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Input
        label={t('org.inviteEmail')}
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t('org.inviteEmailPlaceholder')}
        wrapperClassName="min-w-[14rem] flex-1"
        className="h-9 py-0 text-xs"
      />

      <Input
        label={t('org.jobTitle')}
        name="jobTitle"
        value={jobTitle}
        onChange={(event) => setJobTitle(event.target.value)}
        placeholder={t('org.jobTitlePlaceholder')}
        maxLength={280}
        wrapperClassName="min-w-[10rem] flex-1"
        className="h-9 py-0 text-xs"
      />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-content-muted">{t('org.role')}</p>
        <Select
          value={role}
          onChange={setRole}
          options={ASSIGNABLE_ROLES.map((option) => ({
            value: option,
            label: t(option === 'ADMIN' ? 'org.roleAdmin' : 'org.roleMember'),
          }))}
        />
      </div>

      <Button type="submit" disabled={!canSubmit} isLoading={invite.isPending}>
        <UserPlus className="h-3.5 w-3.5" />
        {t('org.invite')}
      </Button>
    </form>
  );
};

interface OrganizationMembersPanelProps {
  organization: Organization;
}

/**
 * The company's staff list.
 *
 * ## What being on it does and does not mean
 *
 * It means you can see the company: its projects board, its numbers, its
 * calendar and this list. It does **not** put you on any project — opening one
 * still requires being on its roster, and that invitation still comes from the
 * project itself. The panel says so in as many words, because "I added them to
 * the company, why can't they see the work" is the one question this design
 * invites and the one place to answer it is here.
 *
 * Only ever mounted for staff. The endpoints behind it are staff-only, and the
 * page shows a guest an explanation instead — see `OrganizationPage`.
 */
export const OrganizationMembersPanel = ({
  organization,
}: OrganizationMembersPanelProps) => {
  const t = useT();
  const currentUser = useCurrentUser();

  const { data: members = [], isPending } = useOrganizationMembers(organization.id);
  // Admin-only on the API, so it is not asked for by anybody else.
  const { data: invitations = [] } = useOrganizationInvitations(
    organization.id,
    organization.canManage,
  );
  const revoke = useRevokeOrganizationInvitation(organization.id);

  return (
    <div className="space-y-5">
      {organization.canManage && <InviteForm organizationId={organization.id} t={t} />}

      <p className="rounded-xl border border-edge bg-surface-sunken/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-content-muted">
        {t('org.staffExplain')}
      </p>

      <Section
        title={t('org.staff')}
        description={t('org.headcount', { count: organization.memberCount })}
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
                isOwner={organization.isOwner}
                canManage={organization.canManage}
                isSelf={member.id === currentUser?.id}
                t={t}
              />
            ))}
          </ul>
        )}
      </Section>

      {organization.canManage && (
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
              {invitations.map((invitation) => (
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
                    <p className="truncate text-[11px] text-content-faint">
                      {t('org.invitedRelative', {
                        when: formatRelative(invitation.createdAt),
                      })}
                    </p>
                  </div>

                  <Badge>
                    {t(invitation.role === 'ADMIN' ? 'org.roleAdmin' : 'org.roleMember')}
                  </Badge>

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
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
};

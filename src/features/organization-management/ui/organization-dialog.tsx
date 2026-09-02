import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, FolderPlus, Trash2, UserPlus, X } from 'lucide-react';

import {
  useAttachableProjects,
  useCreateOrganization,
  useDeleteOrganization,
  useUpdateOrganization,
} from '@/entities/organization/model/queries';
import type {
  Organization,
  OrganizationInviteDraft,
  OrgRole,
} from '@/entities/organization/model/types';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { Button, ColorPicker, Input, Modal, Select, Textarea } from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

/** The two roles that can be handed out. OWNER is transferred, not granted. */
const ASSIGNABLE_ROLES: OrgRole[] = ['ADMIN', 'MEMBER'];

interface OrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present when editing. Omitted to create a new one. */
  organization?: Organization | null;
}

interface InviteListProps {
  invites: OrganizationInviteDraft[];
  onAdd: (invite: OrganizationInviteDraft) => void;
  onRemove: (index: number) => void;
  t: Translate;
}

/**
 * The people who will be invited once the company exists.
 *
 * A staging list rather than a live one, and that is the whole point: nothing
 * is sent until the dialog is submitted, so somebody assembling a founding team
 * can add four colleagues, notice a typo in the second, fix it, and only then
 * commit. Sending each one on Enter would make every mistake a real invitation
 * that has to be revoked from a screen that does not exist yet.
 *
 * Addresses only, and no directory search. The person creating a company knows
 * the addresses of the people they are creating it with, and a search across
 * every account in the system is a different feature with a different risk
 * profile — see `toDirectoryEntry` on the API for what it costs to offer one.
 */
const InviteList = ({ invites, onAdd, onRemove, t }: InviteListProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('MEMBER');

  const trimmed = email.trim().toLowerCase();
  const isWellFormed = /.+@.+\..+/.test(trimmed);
  const isDuplicate = invites.some(
    (invite) => invite.email?.toLowerCase() === trimmed,
  );
  const canAdd = isWellFormed && !isDuplicate;

  const add = () => {
    if (!canAdd) return;
    onAdd({ email: trimmed, role });
    setEmail('');
  };

  return (
    <section className="space-y-2.5">
      <div className="space-y-1">
        <p className="text-xs font-medium text-content-muted">{t('org.invitePeople')}</p>
        <p className="text-2xs leading-relaxed text-content-faint">
          {t('org.invitePeopleHint')}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          name="inviteEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(clampText(event.target.value, TEXT_LIMITS.email))}
          placeholder={t('org.inviteEmailPlaceholder')}
          maxLength={TEXT_LIMITS.email}
          wrapperClassName="min-w-[12rem] flex-1"
          className="h-9 py-0 text-xs"
          error={isDuplicate ? t('org.inviteDuplicate') : undefined}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            // Inside a `<form>` whose submit creates the organization, so a
            // stray Enter here would create it with this address untyped.
            event.preventDefault();
            add();
          }}
        />

        {/*
          No job title here any more.

          It was asked for at the moment somebody is assembling a founding team
          from a list of email addresses, which is the moment they are least
          likely to know or care what each person's title is — and it made the
          row three fields wide for a label nothing in the app reads. Where
          people are grouped for a *purpose* is a team, which has its own tab
          and can be built once everybody has actually accepted.
        */}
        <Select
          value={role}
          onChange={setRole}
          options={ASSIGNABLE_ROLES.map((option) => ({
            value: option,
            label: t(option === 'ADMIN' ? 'org.roleAdmin' : 'org.roleMember'),
          }))}
        />

        <Button type="button" size="sm" variant="secondary" onClick={add} disabled={!canAdd}>
          <UserPlus className="h-3.5 w-3.5" />
          {t('org.addPerson')}
        </Button>
      </div>

      {invites.length > 0 && (
        <ul className="space-y-1">
          {invites.map((invite, index) => (
            <li
              key={invite.email ?? index}
              className="flex items-center gap-2 rounded-xl border border-edge bg-surface-sunken/60 px-2.5 py-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0 text-content-faint" />
              <span className="min-w-0 flex-1 truncate text-xs">{invite.email}</span>
              <span className="shrink-0 text-3xs uppercase tracking-wide text-content-faint">
                {t(invite.role === 'ADMIN' ? 'org.roleAdmin' : 'org.roleMember')}
              </span>
              <button
                type="button"
                aria-label={t('org.removePerson', { name: invite.email ?? '' })}
                onClick={() => onRemove(index)}
                className="shrink-0 rounded-lg p-1 text-content-faint transition-colors hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

interface ProjectPickerProps {
  selected: string[];
  onToggle: (projectId: string) => void;
  isOpen: boolean;
  t: Translate;
}

/**
 * Which of the caller's own projects this company starts with.
 *
 * Multi-select chips rather than a dropdown, because the answer is usually
 * several and a dropdown makes "several" into several separate acts. Only
 * projects the caller *owns* and has not filed anywhere else are offered —
 * that is the API's rule, not a UI convenience, and the picker is filled from
 * the endpoint that enforces it rather than from the general project list.
 */
const ProjectPicker = ({ selected, onToggle, isOpen, t }: ProjectPickerProps) => {
  // Only asked for while this dialog is actually open — see the query.
  const { data: projects = [], isPending } = useAttachableProjects(isOpen);

  return (
    <section className="space-y-2">
      <div className="space-y-1">
        <p className="text-xs font-medium text-content-muted">
          {t('org.linkProjects')}{' '}
          {selected.length > 0 && (
            <span className="text-content-faint">({selected.length})</span>
          )}
        </p>
        <p className="text-2xs leading-relaxed text-content-faint">
          {t('org.linkProjectsHint')}
        </p>
      </div>

      {isPending && <p className="text-2xs text-content-faint">{t('common.loading')}</p>}

      {!isPending && projects.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge px-3 py-3 text-2xs text-content-faint">
          {t('org.nothingToFile')}
        </p>
      )}

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => {
            const isSelected = selected.includes(project.id);

            return (
              <button
                key={project.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(project.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border py-1 pl-2 pr-2.5 text-xs transition-all duration-150',
                  isSelected
                    ? 'border-brand bg-brand/12 text-brand'
                    : 'border-edge text-content-muted hover:border-content-faint',
                )}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="max-w-[9rem] truncate">{project.name}</span>
                {isSelected ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <FolderPlus className="h-3 w-3" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

/**
 * Create or edit a company, and delete one.
 *
 * ## Why creation asks for more than a name
 *
 * An organization used to be a folder, and a folder needs a name and a colour.
 * A company needs to know whose work it holds and who works there, and both of
 * those are answered *at the moment somebody decides to make one* — "these four
 * projects are this company's, and these three people run them" is a single
 * thought. Splitting it into a create, then a visit to the page, then a picker,
 * then an invite screen is the same thought re-entered four times, and every
 * one of those steps is one somebody can forget.
 *
 * The two halves land differently on purpose, and the API is built around that:
 * the projects are filed in the same transaction as the create, so a company
 * never exists holding half of what it was meant to; the invitations are sent
 * afterwards and reported per person, so one mistyped address does not undo the
 * company and the three good invitations. See `OrganizationsService.create`.
 *
 * ## Why editing asks for less
 *
 * In edit mode the picker and the invite list are gone. Both have better homes
 * once the company exists — the projects board files a project next to the
 * projects it will sit beside, and the staff tab invites somebody next to the
 * list of everybody already invited. A settings dialog that duplicated them
 * would be a second way to do each, with no context around either.
 */
export const OrganizationDialog = ({
  isOpen,
  onClose,
  organization = null,
}: OrganizationDialogProps) => {
  const t = useT();
  const isEditing = Boolean(organization);

  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization(organization?.id ?? '');
  const deleteOrganization = useDeleteOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [invites, setInvites] = useState<OrganizationInviteDraft[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  // Re-seeded on every open: the dialog is mounted by the page, so its state
  // would otherwise be whatever was last typed into it.
  useEffect(() => {
    if (!isOpen) return;

    setName(organization?.name ?? '');
    setDescription(organization?.description ?? '');
    setColor(organization?.color ?? TASK_COLORS[0]);
    setProjectIds([]);
    setInvites([]);
    setIsConfirmingDelete(false);
    setConfirmation('');
  }, [isOpen, organization]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length >= 2;
  /*
   * Case-insensitive: this is a speed bump, not a spelling test.
   *
   * Guarded on `organization` rather than compared against a fallback string,
   * so that in create mode — where there is nothing to delete — this is false
   * because there is no company, not because a sentinel failed to match.
   */
  const canDelete = Boolean(
    organization &&
      confirmation.trim().toLowerCase() === organization.name.trim().toLowerCase(),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (organization) {
      await updateOrganization.mutateAsync({
        name: trimmedName,
        // The empty string is how a description is cleared; `undefined` would
        // read as "leave it alone" and it could never be emptied.
        description: description.trim(),
        color,
      });
    } else {
      await createOrganization.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
        color,
        projectIds: projectIds.length > 0 ? projectIds : undefined,
        invites: invites.length > 0 ? invites : undefined,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!organization || !canDelete) return;

    /*
     * Leave the company's page before the page notices it is gone.
     *
     * This dialog opens from two places: a card on the organizations index,
     * and the settings button *inside* the company's own workspace. In the
     * second case the route that is mounted is `/organizations/:id` for the
     * id being destroyed, and staying there means a page whose every query
     * points at a 404 — which is how deleting one company used to produce a
     * pile of error toasts (see `useDeleteOrganization` for the other half).
     *
     * Checked against the current path rather than done unconditionally: from
     * the index there is nothing to leave, and a redirect that fires anyway
     * would replace a history entry for no reason.
     */
    const isOnItsOwnPage = location.pathname.startsWith(`/organizations/${organization.id}`);

    await deleteOrganization.mutateAsync(organization.id);
    onClose();

    if (isOnItsOwnPage) navigate('/organizations', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'org.editTitle' : 'org.newTitle')}
      description={t(isEditing ? 'org.editSubtitle' : 'org.newSubtitle')}
      className={cn(!isEditing && 'sm:max-w-2xl')}
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={createOrganization.isPending || updateOrganization.isPending}
            disabled={!canSubmit}
          >
            {t(isEditing ? 'project.saveChanges' : 'org.create')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Input
          label={t('org.name')}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('org.namePlaceholder')}
          maxLength={TEXT_LIMITS.organizationName}
          autoFocus
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('org.descriptionPlaceholder')}
          maxLength={TEXT_LIMITS.organizationDescription}
        />

        <ColorPicker
          label={t('project.accentColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />

        {/* Only while creating — see the note above for where each of these
            lives once the company exists. */}
        {!isEditing && (
          <>
            <div className="h-px bg-edge" />

            <ProjectPicker
              isOpen={isOpen}
              selected={projectIds}
              onToggle={(projectId) =>
                setProjectIds((current) =>
                  current.includes(projectId)
                    ? current.filter((id) => id !== projectId)
                    : [...current, projectId],
                )
              }
              t={t}
            />

            <div className="h-px bg-edge" />

            <InviteList
              invites={invites}
              onAdd={(invite) => setInvites((current) => [...current, invite])}
              onRemove={(index) =>
                setInvites((current) => current.filter((_, at) => at !== index))
              }
              t={t}
            />
          </>
        )}

        {/* Only an existing company can be deleted, and only by its owner. */}
        {organization?.isOwner && (
          <section className="space-y-2.5 rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5">
            <header className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
              <h3 className="text-xs font-semibold text-danger">{t('org.dangerZone')}</h3>
            </header>

            {!isConfirmingDelete ? (
              <>
                <p className="text-2xs leading-relaxed text-content-muted">
                  {t('org.deleteExplain')}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('org.delete')}
                </Button>
              </>
            ) : (
              <div className="space-y-2.5">
                <p className="text-2xs leading-relaxed text-content-muted">
                  {t('project.deleteConfirmBody', { name: organization.name })}
                </p>

                <Input
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(clampText(event.target.value, TEXT_LIMITS.organizationName))
                  }
                  placeholder={organization.name}
                  maxLength={TEXT_LIMITS.organizationName}
                  aria-label={t('org.name')}
                  autoComplete="off"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDelete()}
                    isLoading={deleteOrganization.isPending}
                    disabled={!canDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('project.deleteConfirmAction')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      setConfirmation('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </form>
    </Modal>
  );
};

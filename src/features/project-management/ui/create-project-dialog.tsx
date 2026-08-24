import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrganizationMembers, useOrganizations } from '@/entities/organization/model/queries';
import { useCreateProject } from '@/entities/project/model/queries';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { Button, ColorPicker, Input, Modal, Select, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** The value the organization picker uses for "nowhere in particular". */
const UNFILED = '';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Start filed under this company, with the picker locked to it.
   *
   * Set when the dialog is opened from a company's own projects board, where
   * "which organization" has already been answered by being on that page —
   * asking again would be asking somebody to confirm where they are standing.
   * Left unset everywhere else, and the picker is then a free choice.
   */
  organizationId?: string;
}

/**
 * A new project.
 *
 * ## Why the organization is asked for here
 *
 * "This is the Acme account's work" is known at the moment somebody decides to
 * make the project, and a project created loose and filed a minute later spends
 * that minute on everybody else's board in the wrong place. The picker offers
 * only companies where the user is an owner or admin, because filing is an
 * admin act — the API refuses the rest, and a picker that offered them would be
 * offering a failure.
 *
 * ## Why the starting roster appears only once a company is chosen
 *
 * Both halves of it — named people and whole teams — are drawn from a company's
 * staff list, so there is nothing to offer until there is a company. A loose
 * project starts with one person on it, and everybody else arrives through an
 * invitation, because there is no shared membership to draw on.
 *
 * Picking either puts those people on the new project's roster as MEMBERs, then
 * and there — see the API's `TeamsService` for why a team is expanded once
 * rather than stored and resolved later.
 */
export const CreateProjectDialog = ({
  isOpen,
  onClose,
  organizationId,
}: CreateProjectDialogProps) => {
  const t = useT();
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [filedUnder, setFiledUnder] = useState<string>(UNFILED);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  // Only asked for while the dialog is open, and only when the caller has not
  // already decided — a locked picker has nothing to choose between.
  const { data: organizations = [] } = useOrganizations(isOpen && !organizationId);

  /**
   * The companies this person may actually file into.
   *
   * `canManage` is the API's own rule reflected back: owner or admin. A member
   * of a company can see it everywhere else in the app and cannot put work into
   * it, so it is absent here rather than present and refused.
   */
  const filable = useMemo(
    () => organizations.filter((organization) => organization.canManage),
    [organizations],
  );

  /*
   * The chosen company's staff, fetched only once one has been chosen.
   *
   * A loose project has nobody to offer — the creator is the roster, and
   * everybody else arrives by invitation — so this stays disabled until
   * `filedUnder` is set, and the picker below is hidden with it.
   */
  const { data: staff = [] } = useOrganizationMembers(
    filedUnder || undefined,
    isOpen && Boolean(filedUnder),
  );

  // Re-seeded on every open: the dialog is mounted by the shell, so its state
  // would otherwise be whatever was last typed into it.
  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setDescription('');
    setColor(TASK_COLORS[0]);
    setFiledUnder(organizationId ?? UNFILED);
    setTeamIds([]);
    setMemberIds([]);
  }, [isOpen, organizationId]);

  /*
   * Teams belong to the company that was chosen, so changing the company has to
   * drop them. Without this, picking Acme, selecting its design team, then
   * switching to Globex would send Acme's team id to a Globex project — which
   * the API rejects by scoping the lookup, so the result would be a project
   * quietly created with nobody on it.
   */
  const chooseOrganization = (next: string) => {
    setFiledUnder(next);
    setTeamIds([]);
    // Named individuals are scoped to the company for the same reason teams
    // are: the API filters them against that company's staff, so carrying a
    // selection across would silently create a project with nobody on it.
    setMemberIds([]);
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) return;

    const project = await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      organizationId: filedUnder || undefined,
      teamIds: filedUnder && teamIds.length > 0 ? teamIds : undefined,
      memberIds: filedUnder && memberIds.length > 0 ? memberIds : undefined,
    });

    onClose();
    navigate(`/projects/${project.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('project.newTitle')}
      description={t('project.newSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={createProject.isPending}
            disabled={name.trim().length < 2}
          >
            {t('project.create')}
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
          label={t('project.name')}
          name="name"
          value={name}
          onChange={(event) => setName(clampText(event.target.value, TEXT_LIMITS.projectName))}
          placeholder={t('project.namePlaceholder')}
          autoFocus
          maxLength={TEXT_LIMITS.projectName}
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) =>
            setDescription(clampText(event.target.value, TEXT_LIMITS.projectDescription))
          }
          placeholder={t('project.descriptionPlaceholder')}
          maxLength={TEXT_LIMITS.projectDescription}
        />

        <ColorPicker
          label={t('project.accentColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />

        {/*
          Hidden entirely when the caller has already decided — see the prop.
          Also hidden when there is nothing to choose: somebody who runs no
          company should not be shown an empty dropdown explaining a feature
          they have no use for.
        */}
        {!organizationId && filable.length > 0 && (
          <div className="space-y-1.5">
            <Select
              size="md"
              className="w-full"
              label={t('project.organization')}
              value={filedUnder}
              onChange={chooseOrganization}
              options={[
                { value: UNFILED, label: t('project.organizationNone') },
                ...filable.map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                  swatch: organization.color,
                })),
              ]}
            />
            <p className="text-[11px] leading-relaxed text-content-faint">
              {t('project.organizationHint')}
            </p>
          </div>
        )}

        {/* Nothing to draw from until a company is chosen. Individuals is the
            tab this opens on; the teams tab disappears when that company has
            none. */}
        {filedUnder && (
          <InvitePicker
            people={staff}
            selectedPeople={memberIds}
            onTogglePerson={(userId) =>
              setMemberIds((current) =>
                current.includes(userId)
                  ? current.filter((id) => id !== userId)
                  : [...current, userId],
              )
            }
            teamScope={{ organizationId: filedUnder }}
            selectedTeams={teamIds}
            onToggleTeam={(teamId) =>
              setTeamIds((current) =>
                current.includes(teamId)
                  ? current.filter((id) => id !== teamId)
                  : [...current, teamId],
              )
            }
            isOpen={isOpen}
            label={t('project.staffFromTeams')}
            hint={t('project.staffFromTeamsHint')}
          />
        )}
      </form>
    </Modal>
  );
};

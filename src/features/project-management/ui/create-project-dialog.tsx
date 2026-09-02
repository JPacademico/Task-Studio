import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, PenLine, Upload } from 'lucide-react';

import { useOrganizationMembers, useOrganizations } from '@/entities/organization/model/queries';
import { useCreateProject } from '@/entities/project/model/queries';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import { BoardImportPanel } from './board-import-panel';
import { GithubImportPanel } from './github-import-panel';
import { ProjectWindowFields } from './project-window-fields';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { fromDateInput } from '@/shared/lib/dates';
import { clampText } from '@/shared/lib/text';
import { Button, ColorPicker, Input, Modal, Segmented, Select, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** The value the organization picker uses for "nowhere in particular". */
const UNFILED = '';

/**
 * The three ways a project comes into existence.
 *
 * A segmented control rather than three dialogs, because everything below the
 * mode switch is shared: which company it is filed under, what colour it is,
 * and the window it runs for. An import that opened its own window would
 * either ask those questions twice or not ask them at all.
 *
 * The third arrived without changing anything above it, which is the test a
 * shared composer has to pass to be worth having.
 */
type Mode = 'blank' | 'github' | 'board';

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

  const [mode, setMode] = useState<Mode>('blank');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [filedUnder, setFiledUnder] = useState<string>(UNFILED);
  // `yyyy-mm-dd`, or empty. Both optional — see `ProjectWindowFields`.
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
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

    setMode('blank');
    setName('');
    setDescription('');
    setColor(TASK_COLORS[0]);
    setFiledUnder(organizationId ?? UNFILED);
    setStartsAt('');
    setEndsAt('');
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
      /*
       * The chosen days become instants here, at opposite ends of themselves.
       *
       * A finish date read as midnight would refuse a task due at five in the
       * afternoon on the project's own last day, which is exactly when a last
       * task is due. See `fromDateInput`.
       */
      startsAt: fromDateInput(startsAt, 'start'),
      endsAt: fromDateInput(endsAt, 'end'),
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
          {/* The import has its own button, inside the panel and next to the
              preview it acts on — a "Create" in the footer would be a control
              that does nothing until a repository has been looked up, sitting
              a long way from the thing it would create. */}
          {mode === 'blank' && (
            <Button
              onClick={() => void handleSubmit()}
              isLoading={createProject.isPending}
              disabled={name.trim().length < 2}
            >
              {t('project.create')}
            </Button>
          )}
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === 'blank') void handleSubmit();
        }}
      >
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'blank',
              label: t('project.modeBlank'),
              icon: <PenLine className="h-3 w-3" />,
            },
            {
              value: 'github',
              label: t('project.modeGithub'),
              icon: <Github className="h-3 w-3" />,
            },
            {
              value: 'board',
              label: t('project.modeBoard'),
              icon: <Upload className="h-3 w-3" />,
            },
          ]}
        />

        {/* The name and the blurb are what an import *produces*, so in that
            mode they are absent rather than present and ignored. Everything
            below — the company, the accent — applies to both and stays. */}
        {mode === 'blank' && (
          <>
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
          </>
        )}

        <ColorPicker
          label={t('project.accentColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />

        {/*
          Offered for both modes, and that is deliberate rather than incidental.

          An imported project is exactly as likely to have a deadline as a
          typed one — more so, if the repository is a piece of client work —
          and the two fields belong to the *project* rather than to how it came
          into being, which is the same reason the accent and the company sit
          above the mode split rather than inside it.
        */}
        <ProjectWindowFields
          startsAt={startsAt}
          endsAt={endsAt}
          onStartChange={setStartsAt}
          onEndChange={setEndsAt}
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
            <p className="text-2xs leading-relaxed text-content-faint">
              {t('project.organizationHint')}
            </p>
          </div>
        )}

        {mode === 'github' && (
          <GithubImportPanel
            organizationId={filedUnder || undefined}
            color={color}
            /*
             * Closes, and deliberately does not navigate.
             *
             * There is nowhere to go yet: the import is a background job now,
             * and the project it produces does not exist for another half a
             * minute. Navigating to a project id we do not have was the old
             * shape of this callback; the tracker in the app shell carries the
             * job to completion and offers the link when there is one.
             */
            onStarted={onClose}
          />
        )}

        {mode === 'board' && (
          <BoardImportPanel
            organizationId={filedUnder || undefined}
            color={color}
            /*
             * The dialog's own date fields, resolved to instants exactly as
             * the blank path resolves them. A board's cards carry their own
             * deadlines, and the importer clamps any that fall past this —
             * see `clampDeadline` — rather than refusing the whole file.
             */
            startsAt={fromDateInput(startsAt, 'start')}
            endsAt={fromDateInput(endsAt, 'end')}
            onStarted={onClose}
          />
        )}

        {/* Nothing to draw from until a company is chosen. Individuals is the
            tab this opens on; the teams tab disappears when that company has
            none.

            Hidden for an import, whose starting roster comes from the
            repository's contributors — offering both would be two answers to
            "who is on this" with no rule for which wins. */}
        {mode === 'blank' && filedUnder && (
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
          />
        )}
      </form>
    </Modal>
  );
};

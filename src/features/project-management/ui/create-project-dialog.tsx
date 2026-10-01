import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, PenLine, Upload } from 'lucide-react';

import { useOrganizationMembers, useOrganizations } from '@/entities/organization/model/queries';
import { useCreateProject } from '@/entities/project/model/queries';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import type { BoardProvider } from '@/entities/integration/model/types';
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
 * The three ways a project comes into existence. A segmented control rather than three dialogs,
 * because everything below the mode switch is shared.
 */
type Mode = 'blank' | 'github' | 'board';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Start filed under this company, with the picker locked to it. Set when the dialog is opened
   * from a company's own projects board.
   */
  organizationId?: string;
  /** Opens straight on the board import for this provider, e.g. after connecting it. */
  initialBoardSource?: BoardProvider;
}

/**
 * A new project. "This is the Acme account's work" is known at the moment somebody decides to make
 * the project.
 */
export const CreateProjectDialog = ({
  isOpen,
  onClose,
  organizationId,
  initialBoardSource,
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
   * The companies this person may actually file into. `canManage` is the API's own rule reflected
   * back: owner or admin.
   */
  const filable = useMemo(
    () => organizations.filter((organization) => organization.canManage),
    [organizations],
  );

  // The chosen company's staff, fetched only once one has been chosen. A loose project has nobody
  // to offer — the creator is the roster, and everybody else arrives by invitation.
  const { data: staff = [] } = useOrganizationMembers(
    filedUnder || undefined,
    isOpen && Boolean(filedUnder),
  );

  // Re-seeded on every open: the dialog is mounted by the shell, so its state
  // would otherwise be whatever was last typed into it.
  useEffect(() => {
    if (!isOpen) return;

    setMode(initialBoardSource ? 'board' : 'blank');
    setName('');
    setDescription('');
    setColor(TASK_COLORS[0]);
    setFiledUnder(organizationId ?? UNFILED);
    setStartsAt('');
    setEndsAt('');
    setTeamIds([]);
    setMemberIds([]);
  }, [initialBoardSource, isOpen, organizationId]);

  // Teams belong to the company that was chosen, so changing the company has to drop them. Without
  // this, picking Acme, selecting its design team.
  const chooseOrganization = (next: string) => {
    setFiledUnder(next);
    setTeamIds([]);
    // Named individuals are scoped to the company for the same reason teams are: the API filters
    // them against that company's staff.
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
      // The chosen days become instants here, at opposite ends of themselves. A finish date read as
      // midnight would refuse a task due at five in the afternoon on the project's own last day.
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
          {/* The import has its own button. */}
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

        {/* The name and the blurb are what an import *produces*, so in that mode they are
            absent rather than present and ignored. */}
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

        {/* Offered for both modes, and that is deliberate rather than incidental. An imported
            project is exactly as likely to have a deadline as a typed one. */}
        <ProjectWindowFields
          startsAt={startsAt}
          endsAt={endsAt}
          onStartChange={setStartsAt}
          onEndChange={setEndsAt}
        />

        {/* Hidden entirely when the caller has already decided — see the prop. Also hidden when
            there is nothing to choose. */}
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
            /* Closes, and deliberately does not navigate. There is nowhere to go yet: the import is
               a background job now. */
            onStarted={onClose}
          />
        )}

        {mode === 'board' && (
          <BoardImportPanel
            organizationId={filedUnder || undefined}
            color={color}
            /* The dialog's own date fields, resolved to instants exactly as the blank path resolves
               them. */
            startsAt={fromDateInput(startsAt, 'start')}
            endsAt={fromDateInput(endsAt, 'end')}
            initialSource={initialBoardSource}
            onStarted={onClose}
          />
        )}

        {/* Nothing to draw from until a company is chosen. Individuals is the tab this opens
            on; the teams tab disappears when that company has none. */}
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

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Building2,
  CheckCircle2,
  FolderMinus,
  LogOut,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useDetachProject } from '@/entities/organization/model/queries';
import {
  useCompleteProject,
  useDeleteProject,
  useLeaveProject,
  useReopenProject,
  useUpdateProject,
} from '@/entities/project/model/queries';
import type { Project } from '@/entities/project/model/types';
import { useTasks } from '@/entities/task/model/queries';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { fromDateInput, toDateInput } from '@/shared/lib/dates';
import { clampText } from '@/shared/lib/text';
import { useCurrentUser } from '@/features/auth/model/session.store';
import {
  Button,
  ColorPicker,
  Input,
  Modal,
  PasswordInput,
  Select,
  Textarea,
} from '@/shared/ui';
import { ProjectWindowFields } from './project-window-fields';
import { useT } from '@/shared/i18n';

interface ProjectSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  /**
   * Whether to draw the danger zone at all.
   *
   * The dialog opens for owners *and* admins — editing a project has always
   * been an ADMIN capability on the API, and gating the whole sheet on
   * ownership left an admin running a project unable to fix a typo in its name.
   * Deleting it is a different matter and stays the owner's, so the half that
   * does that is simply absent for everybody else rather than present and
   * refused.
   */
  isOwner?: boolean;
  /**
   * Whether the project's name, colour and dates can be changed here.
   *
   * The dialog used to open for owners and admins only, which left a member
   * with no way out of a project at all: leaving has always worked on the API
   * and had no button. It now opens for everybody on the roster, and this is
   * what keeps the editing half to the people the API lets edit — a member
   * sees the one section that is theirs, leaving.
   */
  canEdit?: boolean;
}

/**
 * Renaming a project, re-colouring it, or getting rid of it.
 *
 * ## Why this exists
 *
 * The three things you choose when you create a project — its name, what it is
 * for, and its colour — were, until now, chosen once and permanently. A typo in
 * a project name was a typo everybody on the roster read every day, and the
 * only way to be rid of a project created by mistake was to leave it sitting in
 * the rail forever. The API has always supported both edits and deletion; there
 * was simply nothing on screen that asked for them.
 *
 * ## Who gets it
 *
 * The owner, and nobody else. The API is slightly more generous than that —
 * `PATCH` accepts an admin, `DELETE` insists on the owner — and the difference
 * is deliberate on this side: a control that appears for admins and then fails
 * on the destructive half of the sheet is worse than one that does not appear.
 * A project has exactly one owner, so "can I change this project" has exactly
 * one honest answer.
 *
 * ## Finishing, and deleting
 *
 * Two different endings, and the difference is what survives.
 *
 * **Finishing** keeps the project and empties it: the name, the description,
 * the roster and the teams stay as the record of a piece of work, and every
 * task and page is destroyed. It can be reopened, which gives back that shell
 * and nothing that was in it. Confirmed with a **password** rather than a typed
 * project name, because nothing here is recoverable afterwards — a typed name
 * proves you read the dialog, a password proves it is you.
 *
 * **Deleting** takes the whole thing, and is a *soft* delete: the project lands
 * in the owner's recycle bin and can be restored. Confirmed by typing the
 * project's name, which is the right bar for something reversible.
 *
 * The gentler of the two sits first, because it is the one most people
 * reaching for "delete" actually want.
 */
export const ProjectSettingsDialog = ({
  isOpen,
  onClose,
  project,
  isOwner = false,
  canEdit = false,
}: ProjectSettingsDialogProps) => {
  const t = useT();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const leaveProject = useLeaveProject();

  const updateProject = useUpdateProject(project.id);
  const deleteProject = useDeleteProject();
  const completeProject = useCompleteProject();
  const reopenProject = useReopenProject();
  /*
   * Unfiling is addressed to the *organization*, because that is where the
   * endpoint lives — `DELETE /organizations/:id/projects/:projectId`. The hook
   * needs an id at call time and a project that is filed nowhere has none, so
   * it is handed the empty string and the whole section is hidden in that
   * case: a mutation that can never be triggered is cheaper than a conditional
   * hook, which React does not allow anyway.
   */
  const detachProject = useDetachProject(project.organization?.id ?? '');

  /*
   * The board's tasks, for one number: the latest deadline anybody has
   * scheduled.
   *
   * It costs nothing extra in the ordinary case. This dialog is opened from
   * the project page, which has already fetched exactly this list under
   * exactly this key, so the query is a cache hit and the same `staleTime`
   * every other reader of it gets. What it buys is the finish-date field
   * saying "work is scheduled past that" while the form is still open, instead
   * of the API saying it after a round trip.
   */
  const { data: tasks = [] } = useTasks({ projectId: project.id });

  const latestTaskDue = tasks.reduce<string | null>((latest, task) => {
    if (!task.dueAt) return latest;
    const day = toDateInput(task.dueAt);
    return !latest || day > latest ? day : latest;
  }, null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor] = useState(project.color);
  // `yyyy-mm-dd`, or empty. Both optional — see `ProjectWindowFields`.
  const [startsAt, setStartsAt] = useState(toDateInput(project.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInput(project.endsAt));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  /** Two-step, like the danger-zone controls — but without the typed name. */
  const [isConfirmingUnfile, setIsConfirmingUnfile] = useState(false);
  /**
   * Held only long enough to be sent.
   *
   * Cleared on every open and on every outcome — see the effect below and
   * `handleFinish`. It is never put anywhere but this component's own state:
   * not in a query cache, not in a mutation variable that lingers, and not in
   * anything that gets logged.
   */
  const [password, setPassword] = useState('');
  /** Two-step, like unfiling: the first press arms it, the second leaves. */
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  /**
   * Who takes the project over when its owner leaves.
   *
   * Admins first, then by name: an admin is already running the project
   * alongside the owner, so they are the successor people almost always mean.
   * Pre-selected so the common case is two clicks, never a hunt.
   */
  const successors = [...project.roster]
    .filter((member) => member.id !== currentUser?.id)
    .sort((left, right) =>
      left.role === right.role
        ? left.displayName.localeCompare(right.displayName)
        : left.role === 'ADMIN'
          ? -1
          : right.role === 'ADMIN'
            ? 1
            : 0,
    );
  const [successorId, setSuccessorId] = useState(successors[0]?.id ?? '');

  const isFinished = Boolean(project.completedAt);

  // Re-seeded on every open: the dialog is mounted by the page, so its state
  // would otherwise be whatever was last typed into it — including a half-typed
  // deletion confirmation.
  useEffect(() => {
    if (!isOpen) return;

    setName(project.name);
    setDescription(project.description ?? '');
    setColor(project.color);
    setStartsAt(toDateInput(project.startsAt));
    setEndsAt(toDateInput(project.endsAt));
    setIsConfirmingDelete(false);
    setConfirmation('');
    setIsConfirmingFinish(false);
    setIsConfirmingUnfile(false);
    setPassword('');
    setIsConfirmingLeave(false);
    setSuccessorId((current) =>
      successors.some((member) => member.id === current) ? current : (successors[0]?.id ?? ''),
    );
    // `successors` is derived from the roster on every render; re-seeding on
    // its identity would reset the picker mid-choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project.color, project.description, project.endsAt, project.name, project.startsAt]);

  const trimmedName = name.trim();
  const isDirty =
    trimmedName !== project.name ||
    description.trim() !== (project.description ?? '') ||
    color !== project.color ||
    startsAt !== toDateInput(project.startsAt) ||
    endsAt !== toDateInput(project.endsAt);

  const canSave = trimmedName.length >= 2 && isDirty;
  // Case-insensitive: this is a speed bump, not a spelling test.
  const canDelete = confirmation.trim().toLowerCase() === project.name.trim().toLowerCase();

  const handleSave = async () => {
    if (!canSave) return;

    await updateProject.mutateAsync({
      name: trimmedName,
      // The empty string is how a description is cleared; `undefined` would
      // read as "leave it alone" and the field could never be emptied.
      description: description.trim(),
      color,
      /*
       * `null` on an emptied field, not `undefined`.
       *
       * The dates are on the API's three-state contract — an instant sets it,
       * `null` clears it, absent leaves it alone — and `fromDateInput` answers
       * `undefined` for an empty field, which would mean "leave it alone" and
       * make a finish date impossible to take back off.
       */
      startsAt: fromDateInput(startsAt, 'start') ?? null,
      endsAt: fromDateInput(endsAt, 'end') ?? null,
    });

    onClose();
  };

  const handleFinish = async () => {
    if (password.length === 0) return;

    await completeProject.mutateAsync({ projectId: project.id, password });
    // Gone from state the instant it is no longer needed, whatever happens
    // next — a rejected password leaves the field cleared and the dialog open.
    setPassword('');
    setIsConfirmingFinish(false);
    onClose();
  };

  /**
   * Take the project out of its company, and leave everything else alone.
   *
   * A separate act from deleting, and the reason it needed its own control is
   * that the only way to do it was from the *company's* board — a hover-only
   * ✕ on a card, on a page somebody who wants to unfile their own project has
   * no particular reason to visit, and which an org admin can reach but a
   * project owner who is merely a member of that company cannot see at all.
   * The API has always allowed either party to do it (see `detachProject`),
   * so the project side gets the same control, said in full.
   *
   * Not in the danger zone. Nothing is destroyed: the roster, the tasks, the
   * pages and the teams are all properties of the project, and filing is a
   * label on top of them. Refiling it afterwards is one click on the company
   * page.
   */
  const handleUnfile = () => {
    if (!project.organization) return;

    /*
     * Fired, not awaited — and the dialog closes on the same tick.
     *
     * The mutation rewrites both caches before the request leaves (see
     * `useDetachProject`), so by the time this sheet is gone the header behind
     * it has already dropped the company chip. Awaiting bought nothing except
     * a spinner for the length of a round trip, which on a cold API is most of
     * a minute for a change to one nullable column. A refusal rolls the caches
     * back and says so in a toast, which is the right shape for something the
     * user has already been shown as done.
     */
    detachProject.mutate(project.id);
    setIsConfirmingUnfile(false);
    onClose();
  };

  const handleReopen = async () => {
    await reopenProject.mutateAsync(project.id);
    onClose();
  };

  /**
   * Put the project away, or take it back out.
   *
   * Reversible, destroys nothing, and deliberately *not* in the danger zone —
   * the same argument the unfiling control above makes. An archived project
   * keeps its roster, its board, its pages and its history; it stops appearing
   * on the dashboard, which is the whole of what it does.
   *
   * Closing on archive and staying open on un-archive is the asymmetry that
   * matches what each one is for: putting something away is the last thing
   * somebody wants to do with it, and taking it back out is the first of
   * several.
   */
  const handleArchive = async (next: boolean) => {
    await updateProject.mutateAsync({ isArchived: next });
    if (next) {
      onClose();
      // The dashboard is where it will and will not be, depending. Staying on
      // a project that has just left the board is a page about nothing.
      navigate('/', { replace: true });
    }
  };

  /**
   * Leave, and go somewhere that still exists for you.
   *
   * An owner hands the project to `successorId` on the way out — the API will
   * not let a project be left without one. Navigating before the lists have
   * refetched is deliberate: this page is about to be a 404 for this reader.
   */
  const handleLeave = async () => {
    if (isOwner && !successorId) return;

    await leaveProject.mutateAsync({
      projectId: project.id,
      successorId: isOwner ? successorId : undefined,
    });
    onClose();
    navigate('/', { replace: true });
  };

  const handleDelete = async () => {
    if (!canDelete) return;

    await deleteProject.mutateAsync(project.id);
    onClose();
    // Nothing left to look at here.
    navigate('/', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('project.settingsTitle')}
      description={t(canEdit ? 'project.settingsSubtitle' : 'project.settingsSubtitleMember')}
      flat
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              isLoading={updateProject.isPending}
              disabled={!canSave}
            >
              {t('project.saveChanges')}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        )
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canEdit) void handleSave();
        }}
      >
        {canEdit && (
          <>
            <Input
              label={t('project.name')}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('project.namePlaceholder')}
              maxLength={TEXT_LIMITS.projectName}
              autoFocus
            />

            <Textarea
              label={t('project.description')}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
              The latest deadline on the board is passed in so the finish field can
              object *before* the API does. The API refuses a finish date pulled
              back over work that already exists — it has to, since nothing stops a
              client posting one — and being told the same thing while the form is
              still open, with the offending date named, is the difference between
              a rule and an obstacle.
            */}
            <ProjectWindowFields
              startsAt={startsAt}
              endsAt={endsAt}
              onStartChange={setStartsAt}
              onEndChange={setEndsAt}
              latestTaskDue={latestTaskDue}
            />
          </>
        )}

        {/* --- Where this project is filed ----------------------------------

            Above the rule, because unfiling destroys nothing — see
            `handleUnfile`. Owner only: the API accepts an organization admin
            or the project's owner, and this dialog cannot tell whether the
            reader is the first, so it offers the case it knows is allowed
            rather than one that might be refused. An org admin still has the
            ✕ on the company's own board. */}
        {isOwner && project.organization && (
          <section className="space-y-2.5 rounded-xl border border-edge bg-surface-sunken/50 p-3.5">
            <header className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-content-faint" />
              <h3 className="text-xs font-semibold">{t('project.filedUnderTitle')}</h3>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-3xs text-content-muted">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.organization.color }}
                />
                <span className="max-w-[9rem] truncate">{project.organization.name}</span>
              </span>
            </header>

            <p className="text-2xs leading-relaxed text-content-muted">
              {t('project.unfileExplain')}
            </p>

            <Button
              type="button"
              variant={isConfirmingUnfile ? 'danger' : 'secondary'}
              size="sm"
              onClick={() =>
                isConfirmingUnfile ? handleUnfile() : setIsConfirmingUnfile(true)
              }
              onBlur={() => setIsConfirmingUnfile(false)}
              isLoading={detachProject.isPending}
            >
              <FolderMinus className="h-3.5 w-3.5" />
              {t(isConfirmingUnfile ? 'project.unfileConfirm' : 'project.unfile')}
            </Button>
          </section>
        )}

        {/* --- Out of the way, and back again -------------------------------

            Above the rule for the reason `handleArchive` gives: nothing is
            destroyed and one click undoes it. Hidden on a finished project,
            because the API refuses that combination outright — finishing is
            the stronger state and already keeps the project off the board
            (see `ProjectsService.update`) — so offering the control there
            would be offering a button whose only outcome is an error.

            Owner only, matching every other structural control in this
            dialog. */}
        {isOwner && !isFinished && (
          <section className="space-y-2.5 rounded-xl border border-edge bg-surface-sunken/50 p-3.5">
            <header className="flex items-center gap-2">
              <Archive className="h-3.5 w-3.5 shrink-0 text-content-faint" />
              <h3 className="text-xs font-semibold">
                {t(project.isArchived ? 'project.archivedTitle' : 'project.archiveTitle')}
              </h3>
            </header>

            <p className="text-2xs leading-relaxed text-content-muted">
              {t(project.isArchived ? 'project.unarchiveExplain' : 'project.archiveExplain')}
            </p>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleArchive(!project.isArchived)}
              isLoading={updateProject.isPending}
            >
              {project.isArchived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {t(project.isArchived ? 'project.unarchive' : 'project.archive')}
            </Button>
          </section>
        )}

        {/* --- Leaving -----------------------------------------------------

            Everybody's section, and the only one a member sees. Not in the
            danger zone: nothing is destroyed — the project, its work and its
            history carry on without you, and an invitation brings you back.

            The owner's version asks one more thing, because a project always
            has an owner: who takes it over. With nobody else on the roster
            there is nobody to hand it to, and the section says what is left —
            finishing or deleting it, below. */}
        <section className="space-y-2.5 rounded-xl border border-edge bg-surface-sunken/50 p-3.5">
          <header className="flex items-center gap-2">
            <LogOut className="h-3.5 w-3.5 shrink-0 text-content-faint" />
            <h3 className="text-xs font-semibold">{t('project.leaveTitle')}</h3>
          </header>

          {isOwner && successors.length === 0 ? (
            <p className="text-2xs leading-relaxed text-content-muted">
              {t('project.leaveOnlyMember')}
            </p>
          ) : (
            <>
              <p className="text-2xs leading-relaxed text-content-muted">
                {t(isOwner ? 'project.leaveExplainOwner' : 'project.leaveExplain')}
              </p>

              {isOwner && (
                <Select
                  label={t('project.leaveSuccessor')}
                  value={successorId}
                  onChange={(next) => {
                    setSuccessorId(next);
                    setIsConfirmingLeave(false);
                  }}
                  size="md"
                  className="w-full"
                  options={successors.map((member) => ({
                    value: member.id,
                    label: member.displayName,
                    hint: t(member.role === 'ADMIN' ? 'roster.roleAdmin' : 'roster.roleMember'),
                  }))}
                />
              )}

              <Button
                type="button"
                variant={isConfirmingLeave ? 'danger' : 'secondary'}
                size="sm"
                onClick={() =>
                  isConfirmingLeave ? void handleLeave() : setIsConfirmingLeave(true)
                }
                onBlur={() => setIsConfirmingLeave(false)}
                isLoading={leaveProject.isPending}
                disabled={isOwner && !successorId}
              >
                <LogOut className="h-3.5 w-3.5" />
                {t(
                  isConfirmingLeave
                    ? isOwner
                      ? 'project.leaveConfirmOwner'
                      : 'project.leaveConfirm'
                    : isOwner
                      ? 'project.leaveOwner'
                      : 'project.leave',
                  {
                    name:
                      successors.find((member) => member.id === successorId)?.displayName ?? '',
                  },
                )}
              </Button>
            </>
          )}
        </section>

        {/* --- The dangerous half ------------------------------------------
            Below a rule and behind its own disclosure, so it cannot be reached
            by tabbing past the colour swatches. Owner only — see `isOwner`. */}
        {isOwner && (
        <section className="space-y-2.5 rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5">
          <header className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
            <h3 className="text-xs font-semibold text-danger">{t('project.dangerZone')}</h3>
          </header>

          {/*
            Finishing, above deleting.

            A project that is over is the common case and deleting it is the
            rare one, so the reversible-shaped action comes first — and putting
            it here rather than in the calm half of the sheet is deliberate:
            it destroys tasks and pages, and it belongs behind the same rule.
          */}
          {isFinished ? (
            <div className="space-y-2.5 border-b border-danger/20 pb-3">
              <p className="text-2xs leading-relaxed text-content-muted">
                {t('project.reopenExplain')}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleReopen()}
                isLoading={reopenProject.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('project.reopen')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 border-b border-danger/20 pb-3">
              {!isConfirmingFinish ? (
                <>
                  <p className="text-2xs leading-relaxed text-content-muted">
                    {t('project.finishExplain')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsConfirmingFinish(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('project.finishProject')}
                  </Button>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-2xs leading-relaxed text-danger">
                    {t('project.finishConfirmBody')}
                  </p>

                  <PasswordInput
                    name="finishPassword"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(clampText(event.target.value, TEXT_LIMITS.password))
                    }
                    maxLength={TEXT_LIMITS.password}
                    label={t('project.finishConfirmLabel')}
                    autoFocus
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => void handleFinish()}
                      isLoading={completeProject.isPending}
                      disabled={password.length === 0}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('project.finishConfirmAction')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsConfirmingFinish(false);
                        setPassword('');
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isConfirmingDelete ? (
            <>
              <p className="text-2xs leading-relaxed text-content-muted">
                {t('project.deleteExplain')}
              </p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('project.deleteProject')}
              </Button>
            </>
          ) : (
            <div className="space-y-2.5">
              <p className="text-2xs leading-relaxed text-content-muted">
                {t('project.deleteConfirmBody', { name: project.name })}
              </p>

              <Input
                name="confirmation"
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(clampText(event.target.value, TEXT_LIMITS.projectName))
                }
                maxLength={TEXT_LIMITS.projectName}
                placeholder={project.name}
                aria-label={t('project.deleteConfirmLabel')}
                autoComplete="off"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete()}
                  isLoading={deleteProject.isPending}
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

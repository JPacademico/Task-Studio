import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, FolderMinus, RotateCcw, Trash2 } from 'lucide-react';

import { useDetachProject } from '@/entities/organization/model/queries';
import {
  useCompleteProject,
  useDeleteProject,
  useReopenProject,
  useUpdateProject,
} from '@/entities/project/model/queries';
import type { Project } from '@/entities/project/model/types';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { Button, ColorPicker, Input, Modal, Textarea } from '@/shared/ui';
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
}: ProjectSettingsDialogProps) => {
  const t = useT();
  const navigate = useNavigate();

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

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor] = useState(project.color);
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

  const isFinished = Boolean(project.completedAt);

  // Re-seeded on every open: the dialog is mounted by the page, so its state
  // would otherwise be whatever was last typed into it — including a half-typed
  // deletion confirmation.
  useEffect(() => {
    if (!isOpen) return;

    setName(project.name);
    setDescription(project.description ?? '');
    setColor(project.color);
    setIsConfirmingDelete(false);
    setConfirmation('');
    setIsConfirmingFinish(false);
    setIsConfirmingUnfile(false);
    setPassword('');
  }, [isOpen, project.color, project.description, project.name]);

  const trimmedName = name.trim();
  const isDirty =
    trimmedName !== project.name ||
    description.trim() !== (project.description ?? '') ||
    color !== project.color;

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
  const handleUnfile = async () => {
    if (!project.organization) return;

    await detachProject.mutateAsync(project.id);
    setIsConfirmingUnfile(false);
    onClose();
  };

  const handleReopen = async () => {
    await reopenProject.mutateAsync(project.id);
    onClose();
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
      description={t('project.settingsSubtitle')}
      flat
      footer={
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
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
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
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[10px] text-content-muted">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.organization.color }}
                />
                <span className="max-w-[9rem] truncate">{project.organization.name}</span>
              </span>
            </header>

            <p className="text-[11px] leading-relaxed text-content-muted">
              {t('project.unfileExplain')}
            </p>

            <Button
              type="button"
              variant={isConfirmingUnfile ? 'danger' : 'secondary'}
              size="sm"
              onClick={() =>
                isConfirmingUnfile ? void handleUnfile() : setIsConfirmingUnfile(true)
              }
              onBlur={() => setIsConfirmingUnfile(false)}
              isLoading={detachProject.isPending}
            >
              <FolderMinus className="h-3.5 w-3.5" />
              {t(isConfirmingUnfile ? 'project.unfileConfirm' : 'project.unfile')}
            </Button>
          </section>
        )}

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
              <p className="text-[11px] leading-relaxed text-content-muted">
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
                  <p className="text-[11px] leading-relaxed text-content-muted">
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
                  <p className="text-[11px] leading-relaxed text-danger">
                    {t('project.finishConfirmBody')}
                  </p>

                  <Input
                    name="finishPassword"
                    type="password"
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
              <p className="text-[11px] leading-relaxed text-content-muted">
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
              <p className="text-[11px] leading-relaxed text-content-muted">
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

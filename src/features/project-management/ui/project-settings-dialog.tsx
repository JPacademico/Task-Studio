import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { useDeleteProject, useUpdateProject } from '@/entities/project/model/queries';
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
 * ## Deleting
 *
 * Behind a typed confirmation rather than a second button, because this is the
 * one action here that takes other people's work with it — every task, note,
 * document and conversation the project holds goes quiet at once. It is a soft
 * delete: the project lands in the owner's recycle bin and can be restored, and
 * the copy says so rather than implying a permanence the API does not have.
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

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor] = useState(project.color);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');

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

        {/* --- The dangerous half ------------------------------------------
            Below a rule and behind its own disclosure, so it cannot be reached
            by tabbing past the colour swatches. Owner only — see `isOwner`. */}
        {isOwner && (
        <section className="space-y-2.5 rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5">
          <header className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
            <h3 className="text-xs font-semibold text-danger">{t('project.dangerZone')}</h3>
          </header>

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

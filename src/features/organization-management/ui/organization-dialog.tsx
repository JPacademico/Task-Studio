import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import {
  useCreateOrganization,
  useDeleteOrganization,
  useUpdateOrganization,
} from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { TASK_COLORS } from '@/shared/config/constants';
import { Button, ColorPicker, Input, Modal, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface OrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present when editing. Omitted to create a new one. */
  organization?: Organization | null;
}

/**
 * Create or edit a folder, and delete one.
 *
 * One dialog for both, unlike the project pair (`CreateProjectDialog` and
 * `ProjectSettingsDialog`), because an organization has exactly three editable
 * fields and no settings beyond them — splitting three inputs across two files
 * would be ceremony rather than separation.
 *
 * Deletion sits behind a typed confirmation for the same reason a project's
 * does, with one important difference in the copy: this really does only delete
 * the folder. The projects inside are unfiled, not touched, and the sheet says
 * so plainly — a confirmation that overstates the damage trains people to
 * ignore confirmations.
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  // Re-seeded on every open: the dialog is mounted by the page, so its state
  // would otherwise be whatever was last typed into it.
  useEffect(() => {
    if (!isOpen) return;

    setName(organization?.name ?? '');
    setDescription(organization?.description ?? '');
    setColor(organization?.color ?? TASK_COLORS[0]);
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
   * because there is no folder, not because a sentinel failed to match.
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
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!organization || !canDelete) return;

    await deleteOrganization.mutateAsync(organization.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'org.editTitle' : 'org.newTitle')}
      description={t(isEditing ? 'org.editSubtitle' : 'org.newSubtitle')}
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
          maxLength={80}
          autoFocus
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('org.descriptionPlaceholder')}
          maxLength={500}
        />

        <ColorPicker
          label={t('project.accentColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />

        {/* Only an existing folder can be deleted, and only by its owner —
            which is the only person this dialog opens for in edit mode. */}
        {organization?.isOwner && (
          <section className="space-y-2.5 rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5">
            <header className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
              <h3 className="text-xs font-semibold text-danger">{t('org.dangerZone')}</h3>
            </header>

            {!isConfirmingDelete ? (
              <>
                <p className="text-[11px] leading-relaxed text-content-muted">
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
                <p className="text-[11px] leading-relaxed text-content-muted">
                  {t('project.deleteConfirmBody', { name: organization.name })}
                </p>

                <Input
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={organization.name}
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

import { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';

import { useSetDocumentEditors } from '@/entities/document/model/queries';
import type { ProjectDocument } from '@/entities/document/model/types';
import type { RosterMember } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface DocumentAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProjectDocument;
  /** Everybody who can already read the page — the project's roster. */
  roster: RosterMember[];
}

/**
 * Who else may rewrite this page.
 *
 * ## What this dialog is not
 *
 * It is not a sharing dialog. Everybody on the project can already *read* every
 * page on the board and always could; nothing here changes that, and the copy
 * says so, because "share" is the word people read as "let them see it" and
 * they would then wonder what the rest of the roster is currently missing.
 *
 * What it hands out is the pen. A page is one person's argument at a particular
 * moment — a spec, a proposal, a set of minutes — and until this existed
 * anybody on the roster could open somebody else's and overwrite it. The author
 * decides who helps.
 *
 * ## Why the whole list is sent
 *
 * Granting and revoking are the same act, so the dialog holds a draft set and
 * saves it in one call. A checkbox that fired a mutation per click would make a
 * quick pass down a roster of twelve into twelve requests, each of which can
 * fail on its own and leave the row disagreeing with the screen.
 *
 * The author is not in the list. They already hold the pen, permanently, and a
 * checkbox that cannot be unticked is a control that lies about what it does.
 */
export const DocumentAccessDialog = ({
  isOpen,
  onClose,
  document,
  roster,
}: DocumentAccessDialogProps) => {
  const t = useT();
  const setEditors = useSetDocumentEditors();

  const [selected, setSelected] = useState<string[]>([]);

  // Re-seeded on every open: this dialog is mounted by the board, so its draft
  // would otherwise be whatever was last ticked on a different page.
  useEffect(() => {
    if (!isOpen) return;
    setSelected(document.editors.map((editor) => editor.id));
  }, [document.editors, isOpen]);

  const candidates = roster.filter((member) => member.id !== document.createdBy.id);

  const handleSave = () => {
    setEditors.mutate(
      { documentId: document.id, userIds: selected },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doc.whoCanEdit')}
      description={document.title}
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} isLoading={setEditors.isPending}>
            {t('project.saveChanges')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-2xs leading-relaxed text-content-muted">
          {t('doc.whoCanEditHint')}
        </p>

        {/* The author, stated rather than offered — see the note above. */}
        <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-surface-sunken px-3 py-2">
          <Avatar
            name={document.createdBy.displayName}
            src={document.createdBy.avatarUrl}
            size="xs"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {document.createdBy.displayName}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-3xs text-content-faint">
            <Lock className="h-3 w-3" />
            {t('doc.authorOnly')}
          </span>
        </div>

        {candidates.length === 0 ? (
          <p className="py-4 text-center text-2xs text-content-faint">
            {t('doc.noOneElse')}
          </p>
        ) : (
          <ul className="space-y-1">
            {candidates.map((member) => {
              const isSelected = selected.includes(member.id);

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(member.id)
                          ? current.filter((id) => id !== member.id)
                          : [...current, member.id],
                      )
                    }
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors duration-150',
                      isSelected
                        ? 'border-brand bg-brand/[0.08]'
                        : 'border-transparent hover:border-edge hover:bg-surface-sunken/70',
                    )}
                  >
                    <Avatar name={member.displayName} src={member.avatarUrl} size="xs" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-xs font-medium">
                        {member.displayName}
                      </span>
                      <span className="block truncate text-3xs text-content-faint">
                        {member.email}
                      </span>
                    </span>

                    <span
                      aria-hidden
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-brand bg-brand text-brand-contrast'
                          : 'border-check bg-surface-raised/60',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};

import { useState } from 'react';

import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import type { AccessCatalog, GrantableRole } from '../model/catalogs';
import { AccessPicker, type AccessValue } from './access-picker';

interface MemberAccessDialogProps<P extends string> {
  isOpen: boolean;
  onClose: () => void;
  catalog: AccessCatalog<P>;
  /** Whose access this is, as the roster has it. */
  member: { displayName: string; role: GrantableRole; permissions: P[] };
  grantable: readonly P[];
  onSave: (next: AccessValue<P>) => void;
  isSaving?: boolean;
}

const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((entry) => right.includes(entry));

/** One person's role and permissions, changed in one go. */
export const MemberAccessDialog = <P extends string>({
  isOpen,
  onClose,
  catalog,
  member,
  grantable,
  onSave,
  isSaving = false,
}: MemberAccessDialogProps<P>) => {
  const t = useT();
  // Seeded once: callers mount one dialog per person, as the roster does its report dialog.
  const [value, setValue] = useState<AccessValue<P>>({
    role: member.role,
    permissions: member.permissions,
  });

  const isDirty = value.role !== member.role || !sameSet(value.permissions, member.permissions);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('access.editTitle', { name: member.displayName })}
      description={t('access.editSubtitle')}
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onSave(value)} disabled={!isDirty} isLoading={isSaving}>
            {t('access.save')}
          </Button>
        </>
      }
    >
      <AccessPicker catalog={catalog} value={value} onChange={setValue} grantable={grantable} />
    </Modal>
  );
};

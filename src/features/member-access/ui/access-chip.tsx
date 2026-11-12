import { ChevronDown, Crown, Shield, User } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

interface AccessChipProps {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  /** Effective permissions held, out of `total`. */
  count: number;
  total: number;
  /** Differs from the role's preset. */
  isCustom?: boolean;
  /** The permissions spelled out, for the tooltip. */
  detail?: string;
  /** Present when the reader may change this person's access. */
  onEdit?: () => void;
}

const ICON = {
  OWNER: <Crown className="h-3 w-3 text-warning" />,
  ADMIN: <Shield className="h-3 w-3 text-brand" />,
  MEMBER: <User className="h-3 w-3 text-content-faint" />,
};

/** A person's role and how many permissions ride on it; a button when it can be changed. */
export const AccessChip = ({ role, count, total, isCustom, detail, onEdit }: AccessChipProps) => {
  const t = useT();
  const label = t(
    role === 'OWNER'
      ? 'access.roleOwner'
      : role === 'ADMIN'
        ? 'access.roleAdmin'
        : 'access.roleMember',
  );
  const showCount = role !== 'OWNER' && count > 0;

  const body = (
    <>
      {ICON[role]}
      <span>{label}</span>
      {showCount && (
        <span className="tabular-nums text-content-faint">
          · {count}/{total}
        </span>
      )}
      {isCustom && (
        <span className="rounded-full bg-brand/12 px-1.5 text-4xs uppercase tracking-wide text-brand">
          {t('access.custom')}
        </span>
      )}
      {onEdit && <ChevronDown aria-hidden className="h-3 w-3 text-content-faint" />}
    </>
  );

  const className = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-2xs',
    onEdit &&
      'transition-colors hover:border-brand/50 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
  );

  return onEdit ? (
    <button
      type="button"
      onClick={onEdit}
      className={className}
      title={detail}
      aria-label={t('access.editFor', { role: label })}
    >
      {body}
    </button>
  ) : (
    <span className={className} title={detail}>
      {body}
    </span>
  );
};

import { Check, Shield, User } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Collapsible, Segmented } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import type { AccessCatalog, GrantableRole } from '../model/catalogs';
import { presetWithin } from '../model/catalogs';

export interface AccessValue<P extends string> {
  role: GrantableRole;
  permissions: P[];
}

interface AccessPickerProps<P extends string> {
  catalog: AccessCatalog<P>;
  value: AccessValue<P>;
  onChange: (next: AccessValue<P>) => void;
  /** What the person granting holds; nothing beyond it can be switched on. */
  grantable: readonly P[];
  /** Folds the checklist away, for dialogs where finding the person comes first. */
  collapsible?: boolean;
  className?: string;
}

/**
 * A role, then the permissions on top of it. Picking a role resets the switches to its preset;
 * anything the granter does not hold stays locked, which is the API's rule too.
 */
export const AccessPicker = <P extends string>({
  catalog,
  value,
  onChange,
  grantable,
  collapsible = false,
  className,
}: AccessPickerProps<P>) => {
  const t = useT();
  const count = t('access.count', {
    count: String(value.permissions.length),
    total: String(catalog.all.length),
  });

  // Locked permissions the person already holds stay: the API keeps what the granter cannot touch.
  const setRole = (role: GrantableRole) => {
    const kept = value.permissions.filter((permission) => !grantable.includes(permission));
    const next = [...presetWithin(catalog, role, grantable), ...kept];
    onChange({ role, permissions: catalog.all.filter((entry) => next.includes(entry)) });
  };

  const toggle = (permission: P) => {
    const on = value.permissions.includes(permission);
    const next = on
      ? value.permissions.filter((held) => held !== permission)
      : [...value.permissions, permission];
    // Kept in catalogue order, so a saved set reads the same as a preset.
    onChange({ ...value, permissions: catalog.all.filter((entry) => next.includes(entry)) });
  };

  const checklist = (
    <ul
      aria-label={t('access.permissions')}
      className="divide-y divide-edge/70 overflow-hidden rounded-xl border border-edge bg-surface-sunken/40"
    >
      {catalog.all.map((permission) => {
        const on = value.permissions.includes(permission);
        const locked = !grantable.includes(permission);
        const destructive = catalog.destructive.includes(permission);

        return (
          <li key={permission}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={locked}
              onClick={() => toggle(permission)}
              className={cn(
                'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors duration-150',
                'hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50',
                'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors',
                  on
                    ? destructive
                      ? 'border-danger bg-danger text-white'
                      : 'border-brand bg-brand text-brand-contrast'
                    : 'border-edge bg-surface',
                )}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span
                  className={cn('block text-xs font-medium', destructive && on && 'text-danger')}
                >
                  {t(catalog.label[permission])}
                </span>
                <span className="mt-0.5 block text-3xs leading-snug text-content-faint">
                  {locked ? t('access.cannotGrant') : t(catalog.hint[permission])}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-content-muted">{t('access.role')}</p>
        <Segmented
          value={value.role}
          onChange={setRole}
          label={t('access.role')}
          options={[
            {
              value: 'MEMBER' as GrantableRole,
              label: t('access.roleMember'),
              icon: <User className="h-3 w-3" />,
            },
            {
              value: 'ADMIN' as GrantableRole,
              label: t('access.roleAdmin'),
              icon: <Shield className="h-3 w-3" />,
            },
          ]}
        />
        <p className="text-3xs leading-relaxed text-content-faint">
          {t(catalog.roleHint[value.role])}
        </p>
      </div>

      {collapsible ? (
        <Collapsible
          title={t('access.permissions')}
          badge={<span className="text-3xs tabular-nums text-content-faint">{count}</span>}
          defaultOpen={false}
        >
          {checklist}
        </Collapsible>
      ) : (
        <div className="space-y-1.5">
          <p className="flex items-center justify-between text-xs font-medium text-content-muted">
            {t('access.permissions')}
            <span className="text-3xs tabular-nums text-content-faint">{count}</span>
          </p>
          {checklist}
        </div>
      )}
    </div>
  );
};

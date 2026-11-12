import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLE_PRESETS,
} from '@/entities/organization/model/permissions';
import type { OrgPermission } from '@/entities/organization/model/types';
import { PROJECT_PERMISSIONS, PROJECT_ROLE_PRESETS } from '@/entities/project/model/permissions';
import type { ProjectPermission } from '@/entities/project/model/types';
import type { TranslationKey } from '@/shared/i18n';

/** A role that can be handed out. OWNER moves by transfer. */
export type GrantableRole = 'ADMIN' | 'MEMBER';

/** One scope's permissions, as the access picker draws them. */
export interface AccessCatalog<P extends string> {
  all: readonly P[];
  presets: Record<GrantableRole, readonly P[]>;
  label: Record<P, TranslationKey>;
  hint: Record<P, TranslationKey>;
  /** Drawn with a warning edge: these destroy or take away. */
  destructive: readonly P[];
  roleHint: Record<GrantableRole, TranslationKey>;
}

export const PROJECT_ACCESS: AccessCatalog<ProjectPermission> = {
  all: PROJECT_PERMISSIONS,
  presets: PROJECT_ROLE_PRESETS,
  label: {
    INVITE_MEMBERS: 'access.project.invite',
    MANAGE_ADMINS: 'access.project.admins',
    REMOVE_MEMBERS: 'access.project.remove',
    EDIT_PROJECT: 'access.project.edit',
    DELETE_PROJECT: 'access.project.delete',
    MANAGE_INTEGRATIONS: 'access.project.integrations',
  },
  hint: {
    INVITE_MEMBERS: 'access.project.inviteHint',
    MANAGE_ADMINS: 'access.project.adminsHint',
    REMOVE_MEMBERS: 'access.project.removeHint',
    EDIT_PROJECT: 'access.project.editHint',
    DELETE_PROJECT: 'access.project.deleteHint',
    MANAGE_INTEGRATIONS: 'access.project.integrationsHint',
  },
  destructive: ['REMOVE_MEMBERS', 'DELETE_PROJECT'],
  roleHint: { ADMIN: 'roster.roleAdminHint', MEMBER: 'roster.roleMemberHint' },
};

export const ORGANIZATION_ACCESS: AccessCatalog<OrgPermission> = {
  all: ORGANIZATION_PERMISSIONS,
  presets: ORGANIZATION_ROLE_PRESETS,
  label: {
    INVITE_MEMBERS: 'access.org.invite',
    MANAGE_ADMINS: 'access.org.admins',
    REMOVE_MEMBERS: 'access.org.remove',
    EDIT_ORGANIZATION: 'access.org.edit',
    MANAGE_PROJECTS: 'access.org.projects',
    DELETE_PROJECTS: 'access.org.delete',
  },
  hint: {
    INVITE_MEMBERS: 'access.org.inviteHint',
    MANAGE_ADMINS: 'access.org.adminsHint',
    REMOVE_MEMBERS: 'access.org.removeHint',
    EDIT_ORGANIZATION: 'access.org.editHint',
    MANAGE_PROJECTS: 'access.org.projectsHint',
    DELETE_PROJECTS: 'access.org.deleteHint',
  },
  destructive: ['REMOVE_MEMBERS', 'DELETE_PROJECTS'],
  roleHint: { ADMIN: 'org.roleAdminHint', MEMBER: 'org.roleMemberHint' },
};

/** The preset for a role, cut down to what the person granting it holds. */
export const presetWithin = <P extends string>(
  catalog: AccessCatalog<P>,
  role: GrantableRole,
  grantable: readonly P[],
): P[] => catalog.presets[role].filter((permission) => grantable.includes(permission));

/** Whether a set differs from its role's preset, for the "custom" marker. */
export const isCustomAccess = <P extends string>(
  catalog: AccessCatalog<P>,
  role: string,
  permissions: readonly P[] | undefined,
): boolean => {
  if (role !== 'ADMIN' && role !== 'MEMBER') return false;
  if (!permissions) return false;
  const preset = catalog.presets[role];
  return (
    preset.length !== permissions.length ||
    preset.some((permission) => !permissions.includes(permission))
  );
};

import type { Organization, OrgPermission, OrgRole } from './types';

/** In the order the access picker lists them. Mirrors the API's `ORGANIZATION_PERMISSIONS`. */
export const ORGANIZATION_PERMISSIONS: readonly OrgPermission[] = [
  'INVITE_MEMBERS',
  'MANAGE_ADMINS',
  'REMOVE_MEMBERS',
  'EDIT_ORGANIZATION',
  'MANAGE_PROJECTS',
  'DELETE_PROJECTS',
];

/** What each role starts with. Deleting projects stays opt-in, as on the API. */
export const ORGANIZATION_ROLE_PRESETS: Record<'ADMIN' | 'MEMBER', readonly OrgPermission[]> = {
  ADMIN: [
    'INVITE_MEMBERS',
    'MANAGE_ADMINS',
    'REMOVE_MEMBERS',
    'EDIT_ORGANIZATION',
    'MANAGE_PROJECTS',
  ],
  MEMBER: [],
};

/** Effective permissions; an API older than permissions falls back to the role's preset. */
export const organizationPermissionsOf = (
  role: OrgRole | null,
  permissions?: readonly OrgPermission[],
): OrgPermission[] => {
  if (!role) return [];
  if (role === 'OWNER') return [...ORGANIZATION_PERMISSIONS];
  const held = permissions ?? ORGANIZATION_ROLE_PRESETS[role];
  return ORGANIZATION_PERMISSIONS.filter((permission) => held.includes(permission));
};

export const canInOrganization = (
  organization: Pick<Organization, 'myRole' | 'myPermissions'> | undefined,
  permission: OrgPermission,
): boolean =>
  organization
    ? organizationPermissionsOf(organization.myRole, organization.myPermissions).includes(
        permission,
      )
    : false;

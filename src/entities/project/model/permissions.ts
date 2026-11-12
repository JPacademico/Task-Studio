import type { Project, ProjectPermission, ProjectRole } from './types';

/** In the order the access picker lists them. Mirrors the API's `PROJECT_PERMISSIONS`. */
export const PROJECT_PERMISSIONS: readonly ProjectPermission[] = [
  'INVITE_MEMBERS',
  'MANAGE_ADMINS',
  'REMOVE_MEMBERS',
  'EDIT_PROJECT',
  'DELETE_PROJECT',
  'MANAGE_INTEGRATIONS',
];

/** What each role starts with. Deleting stays opt-in, as on the API. */
export const PROJECT_ROLE_PRESETS: Record<'ADMIN' | 'MEMBER', readonly ProjectPermission[]> = {
  ADMIN: [
    'INVITE_MEMBERS',
    'MANAGE_ADMINS',
    'REMOVE_MEMBERS',
    'EDIT_PROJECT',
    'MANAGE_INTEGRATIONS',
  ],
  MEMBER: [],
};

/** Effective permissions; an API older than permissions falls back to the role's preset. */
export const projectPermissionsOf = (
  role: ProjectRole,
  permissions?: readonly ProjectPermission[],
): ProjectPermission[] => {
  if (role === 'OWNER') return [...PROJECT_PERMISSIONS];
  const held = permissions ?? PROJECT_ROLE_PRESETS[role];
  return PROJECT_PERMISSIONS.filter((permission) => held.includes(permission));
};

export const canInProject = (
  project: Pick<Project, 'myRole' | 'myPermissions'> | undefined,
  permission: ProjectPermission,
): boolean =>
  project
    ? projectPermissionsOf(project.myRole, project.myPermissions).includes(permission)
    : false;

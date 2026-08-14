import type { ListTasksParams } from '@/entities/task/model/types';

/**
 * Central query-key registry. Invalidation is the most bug-prone part of a
 * cache, so the keys live in one file instead of being spelled out inline.
 */
export const queryKeys = {
  session: ['session'] as const,

  projects: {
    all: ['projects'] as const,
    list: (params?: object) => ['projects', 'list', params ?? {}] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
    dashboard: (projectId: string) => ['projects', projectId, 'dashboard'] as const,
    members: (projectId: string) => ['projects', projectId, 'members'] as const,
    invitations: (projectId: string) => ['projects', projectId, 'invitations'] as const,
    overview: ['projects', 'overview'] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    list: (params?: ListTasksParams) => ['tasks', 'list', params ?? {}] as const,
    agenda: (params?: ListTasksParams) => ['tasks', 'agenda', params ?? {}] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
    recycleBin: (projectId?: string) => ['tasks', 'recycle-bin', projectId ?? 'all'] as const,
  },

  notes: {
    all: ['notes'] as const,
    list: (params?: object) => ['notes', 'list', params ?? {}] as const,
    board: (pageIndex: number) => ['notes', 'board', pageIndex] as const,
    /** The project whiteboard's shared Post-it layer. */
    projectBoard: (projectId: string) => ['notes', 'board', 'project', projectId] as const,
    /** Soft-deleted personal notes, restorable from the recycle bin. */
    recycleBin: ['notes', 'recycle-bin'] as const,
  },

  chat: {
    history: (projectId: string) => ['chat', projectId] as const,
  },

  whiteboard: {
    scene: (projectId: string) => ['whiteboard', projectId] as const,
  },

  documents: {
    all: ['documents'] as const,
    /** No project id is the caller's own desk, which is a scope of its own. */
    list: (projectId: string | undefined, taskId?: string) =>
      ['documents', 'list', projectId ?? 'personal', taskId ?? 'all'] as const,
    detail: (documentId: string) => ['documents', documentId] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (unread?: boolean) => ['notifications', 'list', Boolean(unread)] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  invitations: {
    mine: ['invitations', 'mine'] as const,
  },

  ai: {
    status: ['ai', 'status'] as const,
    history: (projectId?: string) => ['ai', 'history', projectId ?? 'all'] as const,
  },
} as const;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { boardsApi } from '../api/boards.api';
import type {
  BoardProvider,
  BoardStatus,
  BoardSyncStatus,
  ConnectedImportPayload,
  LinkBoardPayload,
  RepositoryImportJob,
} from './types';

export const useBoardStatus = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.integrations.boards,
    queryFn: boardsApi.status,
    staleTime: 5 * 60_000,
    enabled,
  });

export const useBoardChoices = (provider: BoardProvider, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.integrations.boardChoices(provider),
    queryFn: () => boardsApi.choices(provider),
    staleTime: 60_000,
    enabled,
    retry: false,
  });

export const useDisconnectBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: BoardProvider) => boardsApi.disconnect(provider),
    onSuccess: (_result, provider) => {
      const key = provider === 'TRELLO' ? 'trello' : 'jira';
      queryClient.setQueryData<BoardStatus>(queryKeys.integrations.boards, (current) =>
        current ? { ...current, [key]: { ...current[key], connection: null } } : current,
      );
      queryClient.removeQueries({ queryKey: queryKeys.integrations.boardChoices(provider) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(translate('boards.disconnected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('boards.disconnectFailed'))),
  });
};

export const useProjectBoardSync = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.projects.boardSync(projectId),
    queryFn: () => boardsApi.projectStatus(projectId),
    staleTime: 30_000,
    enabled: enabled && Boolean(projectId),
  });

/** Every write refreshes the tasks and columns too: the sync may have changed both. */
const useSyncMutation = <TVariables,>(
  projectId: string,
  run: (variables: TVariables) => Promise<BoardSyncStatus | void>,
  successKey?: Parameters<typeof translate>[0],
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: (status) => {
      if (status) queryClient.setQueryData(queryKeys.projects.boardSync(projectId), status);
      else void queryClient.invalidateQueries({ queryKey: queryKeys.projects.boardSync(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskGroups.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(projectId) });
      if (successKey) toast.success(translate(successKey));
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.boardSync(projectId) });
      toast.error(errorMessage(error, translate('boards.syncFailed')));
    },
  });
};

export const useLinkBoard = (projectId: string) =>
  useSyncMutation(projectId, (payload: LinkBoardPayload) => boardsApi.link(projectId, payload), 'boards.linked');

export const useRunBoardSync = (projectId: string) =>
  useSyncMutation(projectId, () => boardsApi.run(projectId), 'boards.synced');

export const useUpdateBoardSync = (projectId: string) =>
  useSyncMutation(projectId, (autoSync: boolean) => boardsApi.update(projectId, autoSync));

export const useUnlinkBoard = (projectId: string) =>
  useSyncMutation(projectId, () => boardsApi.unlink(projectId), 'boards.unlinked');

export const useStartConnectedImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConnectedImportPayload) => boardsApi.startImport(payload),
    onSuccess: (job) => {
      // Seeded so the progress toast appears even before the socket reports.
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        current ? [job, ...current.filter((entry) => entry.id !== job.id)] : [job],
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('boardImport.failed'))),
  });
};

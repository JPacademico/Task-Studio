import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { teamApi } from '../api/team.api';
import type { CreateTeamPayload, TeamScope, UpdateTeamPayload } from './types';

/**
 * Teams change about as often as the roster they are drawn from. A minute, matching the roster and
 * the organization itself.
 */
const TEAMS_STALE_TIME = 60_000;

/** The cache key for a scope, in the one place that knows how to build it. */
const keyFor = (scope: TeamScope) =>
  scope.organizationId
    ? queryKeys.teams.list('organization', scope.organizationId)
    : queryKeys.teams.list('project', scope.projectId as string);

/**
 * One roster's teams. `enabled` because both composers want this list *only while their picker is
 * on screen*, and the task composer in particular is mounted behind every board in the app.
 */
export const useTeams = (scope: TeamScope | null, enabled = true) =>
  useQuery({
    queryKey: scope ? keyFor(scope) : queryKeys.teams.list('project', ''),
    queryFn: () => teamApi.list(scope as TeamScope),
    enabled: Boolean(scope) && enabled,
    staleTime: TEAMS_STALE_TIME,
  });

/**
 * Every write refreshes the one list it could have changed. Not optimistic anywhere, and
 * deliberately so — the same reasoning the organization mutations carry.
 */
const useTeamRefresh = (scope: TeamScope) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: keyFor(scope) });
  };
};

export const useCreateTeam = (scope: TeamScope) => {
  const refresh = useTeamRefresh(scope);

  return useMutation({
    mutationFn: (payload: Omit<CreateTeamPayload, 'organizationId' | 'projectId'>) =>
      teamApi.create({ ...payload, ...scope }),
    onSuccess: (team) => {
      refresh();
      toast.success(translate('team.created', { name: team.name }));
    },
    onError: (error) => toast.error(errorMessage(error, translate('team.createFailed'))),
  });
};

export const useUpdateTeam = (scope: TeamScope) => {
  const refresh = useTeamRefresh(scope);

  return useMutation({
    mutationFn: ({ teamId, payload }: { teamId: string; payload: UpdateTeamPayload }) =>
      teamApi.update(teamId, payload),
    onSuccess: () => {
      refresh();
      toast.success(translate('team.updated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDeleteTeam = (scope: TeamScope) => {
  const refresh = useTeamRefresh(scope);

  return useMutation({
    mutationFn: (teamId: string) => teamApi.remove(teamId),
    onSuccess: () => {
      refresh();
      toast.success(translate('team.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

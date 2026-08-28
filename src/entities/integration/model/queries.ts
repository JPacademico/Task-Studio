import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { calendarApi } from '../api/calendar.api';
import { githubApi } from '../api/github.api';
import type {
  CalendarSettingsPayload,
  RepositoryImportJob,
  RepositoryImportPayload,
} from './types';

/**
 * Looking a repository up, before anything is created.
 *
 * A mutation rather than a query, which is unusual for something that only
 * reads — and deliberate. A query is keyed and cached, and what is wanted here
 * is the opposite: the lookup fires when somebody presses a button, its result
 * belongs to that press, and pasting a different URL must not show the
 * previous repository while the new one loads. `useMutation` is React Query's
 * name for "an imperative request with a result", which is exactly this.
 */
export const usePreviewRepository = () =>
  useMutation({
    mutationFn: githubApi.preview,
    onError: (error) => toast.error(errorMessage(error, translate('github.previewFailed'))),
  });

/**
 * Starting an import.
 *
 * ## Why there is no success toast here any more
 *
 * There used to be, and it was the right shape when this call *was* the
 * import: it returned a project, so it could name one. It now returns a job
 * that has not done anything yet, and "Imported!" at that moment would be a
 * lie by about forty seconds.
 *
 * The announcement moved to where the fact is: `useImportTracker` watches the
 * job to completion and fires the toast when the project actually exists — or
 * says what went wrong when it does not. That is also the only version that
 * works when somebody navigates away mid-import, which is the entire point of
 * having made it a job.
 */
export const useStartImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RepositoryImportPayload) => githubApi.start(payload),
    onSuccess: (job) => {
      /*
       * Seed the tracker's cache with the job we were just handed.
       *
       * Without this the toast appears only when the first socket event lands
       * — a few hundred milliseconds later, and never at all on a tab whose
       * socket is reconnecting. Writing it here means pressing the button
       * always produces something immediately, which is the whole promise of
       * a background import: you are not left wondering whether it took.
       */
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        current ? [job, ...current.filter((entry) => entry.id !== job.id)] : [job],
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('github.importFailed'))),
  });
};

export const useCancelImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => githubApi.cancel(jobId),
    onSuccess: (result) => {
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        (current ?? []).map((job) => (job.id === result.id ? result : job)),
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('github.cancelFailed'))),
  });
};

/**
 * Every import this person has running, kept live.
 *
 * ## Why a query *and* a socket, when either would nearly do
 *
 * They fail in opposite directions and the combination is what makes an
 * import survive being ignored.
 *
 * The **query** is what a freshly mounted app knows. Reload the page, open a
 * second tab, come back from the lock screen — none of those have heard any
 * events, and all of them get the right answer from one request.
 *
 * The **socket** is what makes it feel live. Polling a forty-second job at any
 * interval short enough to look smooth is a request every second or two, for
 * every user with an import open, on a free-tier container.
 *
 * `refetchInterval` is deliberately absent. The events are the update
 * mechanism; a fallback poll is added below only while the socket is *down*,
 * which is the one situation where the query has to carry the whole job.
 */
export const useImportJobs = () => {
  const { socket, isConnected } = useRealtime();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.integrations.imports,
    queryFn: githubApi.listJobs,
    /*
     * No `enabled` gate on the session, and none is needed.
     *
     * The only caller is the import tracker, which is mounted by `AppLayout`
     * — and `AppLayout` renders inside `ProtectedRoute`. Reaching for the
     * session store from here would be an `entities` module importing from
     * `features`, which is the one direction Feature-Sliced Design forbids,
     * to re-enforce a rule the router already enforces.
     */
    // Half a minute, not five seconds. The socket is the update mechanism
    // while it is connected, so a short window buys nothing except a refetch
    // on every tab focus, for a list that is empty almost all the time.
    staleTime: 30_000,
    /*
     * The fallback, and only the fallback.
     *
     * While the socket is connected this is `false` and nothing polls. While
     * it is not — a dropped network, a container that went to sleep with a
     * tracker open — this is the only thing that will ever notice an import
     * finished, so it polls at a rate that is unnoticeable to a person and
     * negligible to the server.
     */
    refetchInterval: isConnected ? false : 8_000,
  });

  useEffect(() => {
    if (!socket) return;

    const handle = (job: RepositoryImportJob) => {
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) => {
        const rest = (current ?? []).filter((entry) => entry.id !== job.id);
        return [job, ...rest];
      });

      /*
       * A finished import means a new project, so the lists that draw projects
       * are now wrong. Invalidated here rather than in the mutation, because
       * *here* is where the project actually starts existing — and this fires
       * on whichever tab is open, including one that did not start the import.
       */
      if (job.status === 'SUCCEEDED') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      }
    };

    socket.on('import:progress', handle);
    return () => {
      socket.off('import:progress', handle);
    };
  }, [queryClient, socket]);

  return query;
};

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

/** Same layering note as `useImportJobs`: both callers are behind the router's
 *  own authentication gate, so there is nothing to check here. */
export const useCalendarStatus = () =>
  useQuery({
    queryKey: queryKeys.integrations.calendar,
    queryFn: calendarApi.status,
    /*
     * Five minutes. The connection changes when the user changes it — which
     * goes through the mutations below and writes the cache directly — or when
     * a background sync records an error, which is not urgent enough to poll
     * for. Refetching on focus covers the one case that matters: coming back
     * to the tab after the consent redirect.
     */
    staleTime: 5 * 60_000,
  });

export const useUpdateCalendarSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CalendarSettingsPayload) => calendarApi.updateSettings(payload),
    onSuccess: (connection) => {
      queryClient.setQueryData(queryKeys.integrations.calendar, {
        available: true,
        connection,
      });
    },
    onError: (error) => toast.error(errorMessage(error, translate('calendar.updateFailed'))),
  });
};

export const useSyncCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarApi.syncNow,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.integrations.calendar, {
        available: true,
        connection: result,
      });
      /*
       * A pull can move a meeting, so the calendars that draw them are stale.
       * Invalidated whether or not anything came back changed: `applied` counts
       * meetings this app rewrote, and a push that created events in Google
       * changes nothing here but still costs nothing to refresh.
       */
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });

      toast.success(
        result.applied > 0
          ? translate('calendar.syncedChanges', { count: String(result.applied) })
          : translate('calendar.syncedClean'),
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('calendar.syncFailed'))),
  });
};

export const useDisconnectCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keepRemote: boolean) => calendarApi.disconnect(keepRemote),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.integrations.calendar, {
        available: true,
        connection: null,
      });
      toast.success(translate('calendar.disconnected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('calendar.disconnectFailed'))),
  });
};

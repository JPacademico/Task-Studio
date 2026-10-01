import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import type { Project } from '@/entities/project/model/types';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { translate } from '@/shared/i18n';
import { calendarApi } from '../api/calendar.api';
import { spotifyApi } from '../api/spotify.api';
import { figmaApi, type ConnectFigmaPayload } from '../api/figma.api';
import { githubApi } from '../api/github.api';
import { importsApi } from '../api/imports.api';
import { tokensApi } from '../api/tokens.api';
import { webhooksApi } from '../api/webhooks.api';
import type {
  BoardImportPayload,
  CalendarSettingsPayload,
  RepositoryImportJob,
  RepositoryImportPayload,
  SpotifyPlayback,
  SpotifyTransport,
  WebhookPayloadDraft,
} from './types';

/**
 * Looking a repository up, before anything is created. A mutation rather than a query, which is
 * unusual for something that only reads — and deliberate.
 */
/**
 * Connecting a project to a repository, and disconnecting it. Both write the *project* cache rather
 * than invalidating it: the API answers with the link.
 */
export const useLinkRepository = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => githubApi.link(projectId, url),
    onSuccess: (repository) => {
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (current) =>
        current ? { ...current, repository } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('repo.connected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('repo.connectFailed'))),
  });
};

export const useUnlinkRepository = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => githubApi.unlink(projectId),
    onSuccess: () => {
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (current) =>
        current ? { ...current, repository: null } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('repo.disconnected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('repo.disconnectFailed'))),
  });
};

/** What this deployment last said about Figma, remembered across reloads. */
const rememberedFigmaAvailability = (): { available: boolean } | undefined => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.figmaAvailable);
    return stored === null ? undefined : { available: stored === 'true' };
  } catch {
    return undefined;
  }
};

const rememberFigmaAvailability = (available: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.figmaAvailable, String(available));
  } catch {
    /* private mode — the answer is simply not remembered for next time */
  }
};

/**
 * Whether this deployment offers Figma at all. Effectively immutable for the life of a session — it
 * is decided by an environment variable on the server.
 */
export const useFigmaAvailability = () => {
  const query = useQuery({
    queryKey: queryKeys.integrations.figma,
    queryFn: figmaApi.status,
    staleTime: 60 * 60_000,
    placeholderData: rememberedFigmaAvailability,
  });

  // Remembered on the way past, in an effect rather than in `queryFn`.
  const available = query.data?.available;

  useEffect(() => {
    if (query.isPlaceholderData || available === undefined) return;
    rememberFigmaAvailability(available);
  }, [available, query.isPlaceholderData]);

  return query;
};

/**
 * Connecting a project to a design file, and disconnecting it. Both write the *project* cache
 * rather than invalidating it, exactly as the repository pair does.
 */
export const useConnectFigma = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConnectFigmaPayload) => figmaApi.connect(projectId, payload),
    onSuccess: (figma) => {
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (current) =>
        current ? { ...current, figma } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('figma.connected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('figma.connectFailed'))),
  });
};

export const useDisconnectFigma = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => figmaApi.disconnect(projectId),
    onSuccess: () => {
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (current) =>
        current ? { ...current, figma: null } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('figma.disconnected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('figma.disconnectFailed'))),
  });
};

/**
 * Keeps the two marks beside a project's name honest for everybody in the room. Both link services
 * have always announced themselves.
 */
export const useProjectMarksRealtime = (projectId: string | undefined): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    const patch = (next: Partial<Project>) => {
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (current) =>
        current ? { ...current, ...next } : current,
      );
      // The lists get an invalidation rather than a write. A project appears in several of them —
      // pinned, by organization, the dashboard's.
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    };

    const onRepository = (event: { projectId: string; repository: Project['repository'] }) => {
      if (event.projectId !== projectId) return;
      patch({ repository: event.repository });
    };

    const onFigma = (event: { projectId: string; figma: Project['figma'] }) => {
      if (event.projectId !== projectId) return;
      patch({ figma: event.figma });
    };

    socket.on('project:repository', onRepository);
    socket.on('project:figma', onFigma);

    return () => {
      socket.off('project:repository', onRepository);
      socket.off('project:figma', onFigma);
    };
  }, [projectId, queryClient, socket]);
};

export const usePreviewRepository = () =>
  useMutation({
    mutationFn: githubApi.preview,
    onError: (error) => toast.error(errorMessage(error, translate('github.previewFailed'))),
  });

/**
 * Starting an import. There used to be, and it was the right shape when this call *was* the import:
 * it returned a project, so it could name one.
 */
export const useStartImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RepositoryImportPayload) => importsApi.startRepository(payload),
    onSuccess: (job) => {
      // Seed the tracker's cache with the job we were just handed. Without this the toast appears
      // only when the first socket event lands — a few hundred milliseconds later.
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        current ? [job, ...current.filter((entry) => entry.id !== job.id)] : [job],
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('github.importFailed'))),
  });
};

/**
 * Starting a board import. Deliberately a sibling of `useStartImport` rather than a parameter on
 * it.
 */
export const useStartBoardImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BoardImportPayload) => importsApi.startBoard(payload),
    onSuccess: (job) => {
      // Seeded for the same reason the repository one is: pressing the button has to produce
      // something immediately, even on a tab whose socket is still reconnecting.
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        current ? [job, ...current.filter((entry) => entry.id !== job.id)] : [job],
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('boardImport.failed'))),
  });
};

export const useCancelImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => importsApi.cancel(jobId),
    onSuccess: (result) => {
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) =>
        (current ?? []).map((job) => (job.id === result.id ? result : job)),
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('github.cancelFailed'))),
  });
};

/**
 * Every import this person has running, kept live. They fail in opposite directions and the
 * combination is what makes an import survive being ignored.
 */
export const useImportJobs = () => {
  const { socket, isConnected } = useRealtime();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.integrations.imports,
    queryFn: importsApi.list,
    // No `enabled` gate on the session, and none is needed. The only caller is the import tracker,
    // which is mounted by `AppLayout` — and `AppLayout` renders inside `ProtectedRoute`.
    staleTime: 30_000,
    // The fallback, and only the fallback. While the socket is connected this is `false` and
    // nothing polls.
    refetchInterval: isConnected ? false : 8_000,
  });

  useEffect(() => {
    if (!socket) return;

    const handle = (job: RepositoryImportJob) => {
      queryClient.setQueryData<RepositoryImportJob[]>(queryKeys.integrations.imports, (current) => {
        const rest = (current ?? []).filter((entry) => entry.id !== job.id);
        return [job, ...rest];
      });

      // A finished import means a new project, so the lists that draw projects are now wrong.
      // Invalidated here rather than in the mutation.
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

// --- Calendar ----------------------------------------------------------------

/** Same layering note as `useImportJobs`: both callers are behind the router's
 *  own authentication gate, so there is nothing to check here. */
export const useCalendarStatus = () =>
  useQuery({
    queryKey: queryKeys.integrations.calendar,
    queryFn: calendarApi.status,
    // Five minutes. The connection changes when the user changes it — which goes through the
    // mutations below and writes the cache directly — or when a background sync records an error.
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
      // A pull can move a meeting, so the calendars that draw them are stale. Invalidated whether
      // or not anything came back changed: `applied` counts meetings this app rewrote.
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

// --- The subscribable calendar feed ------------------------------------------

export const useCalendarFeed = () =>
  useQuery({
    queryKey: queryKeys.integrations.calendarFeed,
    queryFn: calendarApi.feedStatus,
    staleTime: 5 * 60_000,
  });

/**
 * Mint a feed URL, replacing any existing one. The URL is returned to the *caller* rather than
 * written into the cache, and that is the whole contract: it is shown once.
 */
export const useIssueCalendarFeed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarApi.issueFeed,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendarFeed });
    },
    onError: (error) => toast.error(errorMessage(error, translate('feed.issueFailed'))),
  });
};

export const useRevokeCalendarFeed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarApi.revokeFeed,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.integrations.calendarFeed, {
        exists: false,
        createdAt: null,
        lastAccessedAt: null,
      });
      toast.success(translate('feed.revoked'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('feed.revokeFailed'))),
  });
};

// --- Webhooks ----------------------------------------------------------------

export const useProjectWebhooks = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.integrations.webhooks(projectId),
    queryFn: () => webhooksApi.list(projectId),
    enabled: Boolean(projectId) && enabled,
    staleTime: 60_000,
  });

export const useCreateWebhook = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WebhookPayloadDraft) => webhooksApi.create(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.webhooks(projectId) });
    },
    onError: (error) => toast.error(errorMessage(error, translate('webhooks.saveFailed'))),
  });
};

export const useUpdateWebhook = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<WebhookPayloadDraft> & { id: string; isEnabled?: boolean }) =>
      webhooksApi.update(projectId, id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.webhooks(projectId) });
    },
    onError: (error) => toast.error(errorMessage(error, translate('webhooks.saveFailed'))),
  });
};

export const useDeleteWebhook = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookId: string) => webhooksApi.remove(projectId, webhookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.webhooks(projectId) });
    },
    onError: (error) => toast.error(errorMessage(error, translate('webhooks.deleteFailed'))),
  });
};

/** Send a sample delivery and say what came back. */
export const useTestWebhook = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookId: string) => webhooksApi.test(projectId, webhookId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.webhooks(projectId) });

      if (result.delivered) toast.success(translate('webhooks.testDelivered'));
      else {
        toast.error(
          result.error ??
            translate('webhooks.testFailedStatus', { status: String(result.status ?? '—') }),
        );
      }
    },
    onError: (error) => toast.error(errorMessage(error, translate('webhooks.testFailed'))),
  });
};

// --- Personal access tokens --------------------------------------------------

export const useApiTokens = () =>
  useQuery({
    queryKey: queryKeys.integrations.apiTokens,
    queryFn: tokensApi.list,
    staleTime: 60_000,
  });

export const useCreateApiToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; expiresInDays?: number }) => tokensApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.apiTokens });
    },
    onError: (error) => toast.error(errorMessage(error, translate('tokens.createFailed'))),
  });
};

/**
 * Revoking a token, and the one sentence the app says about it. The only surface that calls this —
 * `CliMachinesPanel` — talks about *machines*, deliberately and throughout: "signed-in machines".
 */
export const useRevokeApiToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => tokensApi.revoke(tokenId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.apiTokens });
      toast.success(translate('cli.revoked'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('tokens.revokeFailed'))),
  });
};


// --- Spotify -----------------------------------------------------------------

/**
 * The connection itself: who is linked, and whether the deployment offers this. Long stale time and
 * a refetch on focus, exactly like the calendar's.
 */
export const useSpotifyStatus = () =>
  useQuery({
    queryKey: queryKeys.integrations.spotify,
    queryFn: spotifyApi.status,
    staleTime: 5 * 60_000,
  });

/**
 * What is playing, while somebody is looking at it. Spotify has no webhook and no socket for
 * playback.
 */
export const useSpotifyPlayback = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.integrations.spotifyPlayback,
    queryFn: spotifyApi.playback,
    enabled,
    refetchInterval: enabled ? 5_000 : false,
    retry: false,
    staleTime: 2_000,
  });

/**
 * Press a button, then ask what happened. Spotify applies a transport command asynchronously — the
 * endpoint answers 204 well before the device has actually skipped.
 */
export const useSpotifyCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: SpotifyTransport) => spotifyApi.command(action),
    onSuccess: () => {
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.spotifyPlayback });
      }, 400);
    },
    onError: (error) => toast.error(errorMessage(error, translate('spotify.commandFailed'))),
  });
};

/**
 * The volume slider. Optimistic, and it has to be: a slider that waits for a server round trip
 * before moving is a slider that does not work.
 */
export const useSpotifyVolume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (volume: number) => spotifyApi.setVolume(volume),
    onMutate: (volume) => {
      const previous = queryClient.getQueryData<SpotifyPlayback | undefined>(
        queryKeys.integrations.spotifyPlayback,
      );

      queryClient.setQueryData<SpotifyPlayback | undefined>(
        queryKeys.integrations.spotifyPlayback,
        (current) => (current ? { ...current, volume } : current),
      );

      return { previous };
    },
    onError: (error, _volume, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.integrations.spotifyPlayback, context.previous);
      }
      toast.error(errorMessage(error, translate('spotify.commandFailed')));
    },
  });
};

/** Start one of the search results, replacing whatever is playing. */
export const useSpotifyPlayTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) => spotifyApi.play(trackId),
    onSuccess: () => {
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.spotifyPlayback });
      }, 400);
    },
    onError: (error) => toast.error(errorMessage(error, translate('spotify.commandFailed'))),
  });
};

/** Put one of the search results next in line. */
export const useSpotifyQueueTrack = () =>
  useMutation({
    mutationFn: (track: { id: string; name: string }) => spotifyApi.queue(track.id),
    onSuccess: (_result, track) =>
      toast.success(translate('spotify.queued', { name: track.name })),
    onError: (error) => toast.error(errorMessage(error, translate('spotify.queueFailed'))),
  });

/** Forget the grant. */
export const useDisconnectSpotify = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: spotifyApi.disconnect,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.integrations.spotify, {
        available: true,
        connection: null,
      });
      queryClient.removeQueries({ queryKey: queryKeys.integrations.spotifyPlayback });
      toast.success(translate('spotify.disconnected'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('spotify.disconnectFailed'))),
  });
};

/** Keep the grant, hide the player. */
export const useSetSpotifyEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isEnabled: boolean) => spotifyApi.setEnabled(isEnabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.spotify });
    },
    onError: (error) => toast.error(errorMessage(error, translate('spotify.updateFailed'))),
  });
};

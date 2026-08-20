import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { aiApi, type AiSuggestion, type ProjectTaskSuggestion } from '../api/ai.api';

type StreamStatus = 'idle' | 'working' | 'error';

interface JobEvent {
  jobId: string;
  projectId: string;
}

/**
 * How long to wait for a job to report back before going to look for it.
 *
 * Generously past the API's own ceiling for one of these — two bounded attempts
 * plus the pause between them — so this only fires when something has genuinely
 * gone missing rather than merely taken a while. What goes missing is almost
 * always the *delivery*: a socket that dropped and reconnected loses the events
 * that were emitted while it was away, and the job on the other end finished
 * perfectly well.
 */
const WATCHDOG_MS = 100_000;

/**
 * Suggestions as they are written, rather than all at once at the end.
 *
 * ## What changed and why
 *
 * Asking for suggestions used to be one long POST. The request was held open
 * for the whole generation — tens of seconds against this model — which put it
 * in a race with every timeout between the browser and the API, and losing that
 * race produced the worst possible outcome: the server carried on producing an
 * answer nobody would ever see, and the user was told it had failed.
 *
 * Now the POST only starts the job and returns a receipt. The suggestions
 * arrive on the socket that is already open for chat and the whiteboard, one at
 * a time as each is finished, so the panel fills in visibly instead of sitting
 * blank and then blinking into existence. There is no request left to time out.
 *
 * ## The three ways this can still go wrong, and what happens
 *
 * 1. **No socket.** Nothing would ever be delivered, so `start` uses the
 *    synchronous route instead. Slower, but it cannot silently hang.
 * 2. **The socket drops mid-job.** The events emitted while it was away are
 *    gone — Socket.io replays nothing. The watchdog notices the silence and
 *    goes looking in the suggestion history, where the finished job has already
 *    persisted its result.
 * 3. **The job genuinely failed.** It says so, over the same channel.
 *
 * Only after all three come up empty does the panel show an error.
 */
export const useSuggestionStream = (projectId: string) => {
  const { socket, isConnected } = useRealtime();
  const queryClient = useQueryClient();

  const [suggestions, setSuggestions] = useState<ProjectTaskSuggestion[]>([]);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  /*
   * The job being watched, in a ref rather than state.
   *
   * The socket handlers are registered once and must compare against whatever
   * the *current* job is; reading it from state would capture the value at the
   * time the effect ran, so every event after the first job would be discarded
   * as belonging to somebody else.
   */
  const jobId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const watchdog = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stopWatchdog = useCallback(() => {
    clearTimeout(watchdog.current);
    watchdog.current = undefined;
  }, []);

  const settle = useCallback(
    (suggestion: AiSuggestion) => {
      stopWatchdog();
      jobId.current = null;
      setSuggestionId(suggestion.id);
      // The persisted row is the authority; the streamed items were a preview
      // of it, and anything the incremental parse skipped is present here.
      setSuggestions(suggestion.result.tasks ?? []);
      setStatus('idle');
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.history(projectId) });
    },
    [projectId, queryClient, stopWatchdog],
  );

  const fail = useCallback(
    (message: string) => {
      stopWatchdog();
      jobId.current = null;
      setStatus('error');
      setErrorText(message);
    },
    [stopWatchdog],
  );

  /** Silence is not failure — the result may simply have been delivered to a socket that had gone. */
  const recover = useCallback(async () => {
    try {
      const history = await aiApi.history(projectId);
      const landed = history.find(
        (entry) =>
          entry.kind === 'PROJECT_TASKS' &&
          Date.parse(entry.createdAt) >= startedAt.current - 1_000 &&
          (entry.result.tasks?.length ?? 0) > 0,
      );

      if (landed) {
        settle(landed);
        return;
      }
    } catch {
      /* Fall through to the error below — the panel offers a retry either way. */
    }

    fail(translate('ai.unavailable'));
  }, [fail, projectId, settle]);

  const armWatchdog = useCallback(() => {
    stopWatchdog();
    watchdog.current = setTimeout(() => void recover(), WATCHDOG_MS);
  }, [recover, stopWatchdog]);

  // Switching projects must not leave the previous board's proposals on screen,
  // nor leave a watchdog running for a job nobody is watching any more.
  useEffect(() => {
    setSuggestions([]);
    setSuggestionId(null);
    setStatus('idle');
    setErrorText(null);
    jobId.current = null;
    stopWatchdog();
  }, [projectId, stopWatchdog]);

  useEffect(() => stopWatchdog, [stopWatchdog]);

  useEffect(() => {
    if (!socket) return;

    const mine = (event: JobEvent) =>
      event.projectId === projectId && event.jobId === jobId.current;

    const onItem = (event: JobEvent & { index: number; task: ProjectTaskSuggestion }) => {
      if (!mine(event) || !event.task?.title) return;

      setSuggestions((current) =>
        // Keyed on title because that is also what `accept` sends — a duplicate
        // would give the user two cards that resolve to one task.
        current.some((entry) => entry.title === event.task.title)
          ? current
          : [...current, event.task],
      );
    };

    const onDone = (event: JobEvent & { suggestion: AiSuggestion }) => {
      if (!mine(event)) return;
      settle(event.suggestion);
    };

    const onFailed = (event: JobEvent & { message?: string }) => {
      if (!mine(event)) return;
      fail(event.message ?? translate('ai.unavailable'));
    };

    socket.on('ai:item', onItem);
    socket.on('ai:done', onDone);
    socket.on('ai:failed', onFailed);

    return () => {
      socket.off('ai:item', onItem);
      socket.off('ai:done', onDone);
      socket.off('ai:failed', onFailed);
    };
  }, [fail, projectId, settle, socket]);

  const start = useCallback(async () => {
    setStatus('working');
    setErrorText(null);
    setSuggestions([]);
    setSuggestionId(null);
    startedAt.current = Date.now();

    // No socket means no delivery. The synchronous route is slower and holds a
    // request open, but it is the only one that can answer at all here.
    if (!socket || !isConnected) {
      try {
        settle(await aiApi.suggestProjectTasks(projectId));
      } catch (error) {
        fail(errorMessage(error, translate('ai.unavailable')));
      }
      return;
    }

    try {
      const { jobId: id } = await aiApi.startProjectTasks(projectId);
      jobId.current = id;
      armWatchdog();
    } catch (error) {
      fail(errorMessage(error, translate('ai.unavailable')));
    }
  }, [armWatchdog, fail, isConnected, projectId, settle, socket]);

  const forget = useCallback(
    (title: string) =>
      setSuggestions((current) => current.filter((entry) => entry.title !== title)),
    [],
  );

  return {
    suggestions,
    suggestionId,
    status,
    errorText,
    /** True once the job is running but before anything has been produced. */
    isEmptyWorking: status === 'working' && suggestions.length === 0,
    start,
    forget,
  };
};

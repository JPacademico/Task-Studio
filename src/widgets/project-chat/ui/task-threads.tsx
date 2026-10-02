import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Clock3, Lock, MessagesSquare, RotateCcw, Trash2 } from 'lucide-react';

import { useProject } from '@/entities/project/model/queries';
import { useTask } from '@/entities/task/model/queries';
import { taskCommentApi } from '@/entities/task-comment/api/task-comment.api';
import {
  COMMENT_PAGE,
  dropComment,
  loadEarlierComments,
  markThreadRead,
  setCommentDelivery,
  upsertComment,
  useTaskThreads,
  useThreadComments,
} from '@/entities/task-comment/model/queries';
import type { TaskComment } from '@/entities/task-comment/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { useChatDock } from '@/features/project-chat-dock/model/chat-dock.store';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { useT } from '@/shared/i18n';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatRelative, formatTime } from '@/shared/lib/dates';
import { clampText } from '@/shared/lib/text';
import { toast } from '@/shared/lib/toast';
import { uid } from '@/shared/lib/uid';
import { Avatar, Button, PostItMark, SendGlyph, SkinLoader } from '@/shared/ui';

const SOURCE_LABEL = { JIRA: 'Jira', TRELLO: 'Trello' } as const;

/** The "Tasks" side of the project chat: the list of threads, or the one picked from it. */
export const TaskThreads = ({ projectId }: { projectId: string }) => {
  const taskId = useChatDock((state) => state.threadTaskId);
  return taskId ? (
    <TaskThread key={taskId} projectId={projectId} taskId={taskId} />
  ) : (
    <ThreadList projectId={projectId} />
  );
};

/** Tasks with comments, newest activity first, each with how much of it is new. */
const ThreadList = ({ projectId }: { projectId: string }) => {
  const t = useT();
  const showThread = useChatDock((state) => state.showThread);
  const { data: threads = [], isLoading } = useTaskThreads();
  const rows = threads.filter((thread) => thread.projectId === projectId);

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10">
        <SkinLoader label={t('threads.loading')} />
        <p className="text-2xs text-content-faint">{t('threads.loading')}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 text-center">
        <MessagesSquare className="h-6 w-6 text-content-faint" aria-hidden />
        <p className="text-xs leading-relaxed text-content-faint">{t('threads.empty')}</p>
      </div>
    );
  }

  return (
    <ul className="scrollbar-thin flex-1 divide-y divide-edge overflow-y-auto">
      {rows.map((thread) => (
        <li key={thread.taskId}>
          <button
            type="button"
            onClick={() => showThread(thread.taskId)}
            className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
          >
            <span
              aria-hidden
              className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: thread.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-xs font-semibold',
                    thread.status === 'COMPLETED' && 'text-content-muted line-through',
                  )}
                >
                  {thread.title}
                </span>
                <span className="shrink-0 text-4xs text-content-faint">
                  {formatRelative(thread.lastCommentAt)}
                </span>
              </span>
              {thread.preview && (
                <span className="mt-0.5 block truncate text-2xs text-content-muted">
                  <span className="font-medium">{thread.preview.author}:</span>{' '}
                  {thread.preview.content}
                </span>
              )}
            </span>
            {thread.unread > 0 && (
              <span
                className="mt-0.5 shrink-0 text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.3)]"
                title={t('threads.unread', { count: String(thread.unread) })}
              >
                <PostItMark count={thread.unread} className="h-[1.125rem] w-[1.125rem]" />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
};

/** One task's thread: its comments and a composer, read as soon as it is on screen. */
const TaskThread = ({ projectId, taskId }: { projectId: string; taskId: string }) => {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const showThread = useChatDock((state) => state.showThread);

  const { data: task, isError: taskMissing } = useTask(taskId);
  const { data: project } = useProject(projectId);
  const { data: comments = [], isLoading } = useThreadComments(
    task?.commentsEnabled === false ? null : taskId,
  );

  const [draft, setDraft] = useState('');
  const [hasEarlier, setHasEarlier] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heightBeforePrepend = useRef<number | null>(null);

  const isOff = task?.commentsEnabled === false;
  const isReadOnly = Boolean(project?.completedAt);

  // On screen is read: on open, and again whenever the tab comes back into view.
  useEffect(() => {
    if (isOff) return;
    const read = () => {
      if (document.visibilityState === 'visible') markThreadRead(queryClient, taskId);
    };
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, [isOff, queryClient, taskId]);

  const last = comments[comments.length - 1];
  const lastKey = last ? (last.clientId ?? last.id) : null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lastKey]);

  // Older comments go in above the reader without moving the line being read.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    const before = heightBeforePrepend.current;
    if (!element || before === null) return;
    heightBeforePrepend.current = null;
    element.scrollTop += element.scrollHeight - before;
  }, [comments]);

  const loadEarlier = async () => {
    if (isLoadingEarlier) return;
    setIsLoadingEarlier(true);
    heightBeforePrepend.current = scrollRef.current?.scrollHeight ?? null;
    try {
      const count = await loadEarlierComments(queryClient, taskId);
      if (count < COMMENT_PAGE) setHasEarlier(false);
      if (count === 0) heightBeforePrepend.current = null;
    } catch {
      heightBeforePrepend.current = null;
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  /** Drawn first, sent second; the server's copy replaces ours by client id. */
  const deliver = async (comment: TaskComment) => {
    try {
      const saved = await taskCommentApi.create(taskId, {
        content: comment.content,
        clientId: comment.clientId as string,
      });
      upsertComment(queryClient, saved);
    } catch (error) {
      setCommentDelivery(queryClient, taskId, comment.clientId as string, 'failed');
      toast.error(errorMessage(error));
    }
  };

  const send = () => {
    const content = draft.trim();
    if (!content || !user) return;

    const clientId = uid();
    const local: TaskComment = {
      id: `local:${clientId}`,
      clientId,
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      taskId,
      userId: user.id,
      user,
      delivery: 'pending',
    };
    queryClient.setQueryData<TaskComment[]>(queryKeys.taskComments.thread(taskId), (current = []) => [
      ...current,
      local,
    ]);
    setDraft('');
    void deliver(local);
  };

  const retry = (comment: TaskComment) => {
    setCommentDelivery(queryClient, taskId, comment.clientId as string, 'pending');
    void deliver(comment);
  };

  const remove = (comment: TaskComment) => {
    dropComment(queryClient, taskId, comment.id);
    taskCommentApi.remove(taskId, comment.id).catch((error) => {
      toast.error(errorMessage(error));
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskComments.thread(taskId) });
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-edge px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => showThread(null)}
          aria-label={t('threads.back')}
          title={t('threads.back')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        {task && (
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: task.color }}
          />
        )}
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">
          {task?.title ?? (taskMissing ? t('threads.notFound') : '…')}
        </p>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {isOff ? (
          <p className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-content-faint">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            {t('threads.disabled')}
          </p>
        ) : isLoading && comments.length === 0 ? (
          <div className="flex justify-center py-8">
            <SkinLoader label={t('threads.loading')} />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-xs text-content-faint">{t('threads.emptyThread')}</p>
        ) : null}

        {!isOff && hasEarlier && comments.length >= COMMENT_PAGE && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadEarlier()}
              disabled={isLoadingEarlier}
              className="text-2xs"
            >
              {isLoadingEarlier ? t('chat.loadingEarlier') : t('threads.loadEarlier')}
            </Button>
          </div>
        )}

        {!isOff &&
          comments.map((comment) => {
            const isMine = comment.userId === user?.id && !comment.externalAuthor;
            const name = comment.externalAuthor ?? comment.user.displayName;

            return (
              <div
                key={comment.clientId ?? comment.id}
                className={cn('group/comment flex items-end gap-2', isMine && 'flex-row-reverse')}
              >
                <Avatar
                  name={name}
                  src={comment.externalAuthor ? null : comment.user.avatarUrl}
                  size="xs"
                />
                <div
                  className={cn(
                    'max-w-[72%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    isMine
                      ? 'rounded-br-corner bg-brand text-brand-contrast'
                      : 'rounded-bl-corner bg-surface-sunken text-content',
                    comment.delivery === 'failed' && 'opacity-80 ring-1 ring-danger',
                  )}
                >
                  {!isMine && (
                    <p className="mb-0.5 flex items-center gap-1 text-3xs font-semibold opacity-70">
                      {name}
                      {comment.externalSource && (
                        <span className="rounded border border-current px-1 text-4xs font-medium">
                          {t('threads.fromSource', {
                            source: SOURCE_LABEL[comment.externalSource],
                          })}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                  <p className="mt-1 flex items-center gap-1 text-4xs opacity-60">
                    {formatTime(comment.createdAt)}
                    {comment.delivery === 'pending' && (
                      <Clock3 className="h-2.5 w-2.5" aria-label={t('chat.sending')} />
                    )}
                  </p>
                </div>
                {comment.delivery === 'failed' ? (
                  <button
                    type="button"
                    onClick={() => retry(comment)}
                    title={t('chat.notSentHelp')}
                    aria-label={t('chat.retry')}
                    className="group/retry flex items-center rounded-full p-0.5 text-danger hover:bg-danger/10"
                  >
                    <AlertCircle className="h-3.5 w-3.5 group-hover/retry:hidden" />
                    <RotateCcw className="hidden h-3.5 w-3.5 group-hover/retry:block" />
                  </button>
                ) : (
                  isMine &&
                  !comment.delivery && (
                    <button
                      type="button"
                      onClick={() => remove(comment)}
                      aria-label={t('threads.delete')}
                      title={t('threads.delete')}
                      className="rounded-full p-1 text-content-faint opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover/comment:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            );
          })}
      </div>

      {!isOff &&
        (isReadOnly ? (
          <p className="border-t border-edge px-3 py-2.5 text-center text-2xs text-content-faint">
            {t('threads.readOnly')}
          </p>
        ) : (
          <form
            className="flex items-center gap-2 border-t border-edge p-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={draft}
              onChange={(event) =>
                setDraft(clampText(event.target.value, TEXT_LIMITS.chatMessage))
              }
              placeholder={t('threads.placeholder')}
              maxLength={TEXT_LIMITS.chatMessage}
              aria-label={t('threads.placeholder')}
              className="field h-9 text-xs"
            />
            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label={t('chat.send')}>
              <SendGlyph />
            </Button>
          </form>
        ))}
    </div>
  );
};

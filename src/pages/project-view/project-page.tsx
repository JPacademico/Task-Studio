import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  FileText,
  KanbanSquare,
  MessageCircle,
  PenTool,
  Pin,
  Plus,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';

import { useProjectRoom } from '@/app/providers/realtime-provider';
import {
  useProjectMeetings,
  useProjectMeetingsRealtime,
} from '@/entities/meeting/model/queries';
import {
  useProject,
  usePrefetchProjectCollaboration,
  useTogglePin,
} from '@/entities/project/model/queries';
import { completionBlockedReason } from '@/entities/task/lib/completion';
import {
  useDeleteTask,
  useTasks,
  useToggleMyCompletion,
  useToggleTaskPin,
  useUpdateTaskStatus,
} from '@/entities/task/model/queries';
import type { ListTasksParams, Task } from '@/entities/task/model/types';
import { AiPanel } from '@/features/ai-suggestions/ui/ai-panel';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { TaskBoard } from '@/features/dnd-board/ui/task-board';
import { useChatDock } from '@/features/project-chat-dock/model/chat-dock.store';
import {
  useProjectChatUnread,
  usePrefetchProjectChat,
} from '@/features/project-chat-dock/ui/chat-dock';
import { MeetingsPanel } from '@/features/meetings/ui/meetings-panel';
import { ProjectSettingsDialog } from '@/features/project-management/ui/project-settings-dialog';
import { RosterPanel } from '@/features/roster/ui/roster-panel';
import { TaskComposer } from '@/features/task-management/ui/task-composer';
import { TaskDetailModal } from '@/features/task-management/ui/task-detail-modal';
import { PendingTasks } from '@/entities/task/ui/pending-tasks';
import { TaskFilters } from '@/features/task-management/ui/task-filters';
import {
  LayoutSwitcher,
  TaskCalendarView,
  TaskListView,
  TaskSprintView,
  useTaskLayout,
} from '@/features/task-views';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, PageLoader, Segmented } from '@/shared/ui';
import { ProjectDashboard } from '@/widgets/project-dashboard/ui/project-dashboard';
import { TextBoard } from '@/widgets/text-board/ui/text-board';
import { Whiteboard } from '@/widgets/whiteboard/ui/whiteboard';
import { useT, type TranslationKey } from '@/shared/i18n';

type Tab = 'board' | 'dashboard' | 'roster' | 'meetings' | 'whiteboard' | 'text' | 'ai';

const TABS: { value: Tab; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'board', label: 'project.tabBoard', icon: <KanbanSquare className="h-3 w-3" /> },
  { value: 'dashboard', label: 'project.tabMetrics', icon: <BarChart3 className="h-3 w-3" /> },
  { value: 'roster', label: 'project.tabRoster', icon: <Users className="h-3 w-3" /> },
  // Next to the roster rather than to the board: a meeting is an appointment
  // between people, and the question it answers is "who, and when" — not
  // "what state is this work in".
  { value: 'meetings', label: 'project.tabMeetings', icon: <CalendarDays className="h-3 w-3" /> },
  { value: 'whiteboard', label: 'project.tabWhiteboard', icon: <PenTool className="h-3 w-3" /> },
  // Next to the whiteboard on purpose: the two are the same idea in different
  // materials — one is what the project draws, the other is what it writes.
  { value: 'text', label: 'project.tabText', icon: <FileText className="h-3 w-3" /> },
  { value: 'ai', label: 'project.tabAssistant', icon: <Sparkles className="h-3 w-3" /> },
];

/**
 * The project workspace. Joining the socket room here is what makes chat,
 * whiteboard strokes and teammates' task edits arrive live.
 */
const ProjectPage = () => {
  const t = useT();
  const { projectId } = useParams<{ projectId: string }>();
  useProjectRoom(projectId);

  const currentUser = useCurrentUser();

  const [tab, setTab] = useState<Tab>('board');
  const [filters, setFilters] = useState<ListTasksParams>({ scope: 'all' });
  const [composerTask, setComposerTask] = useState<Task | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  /*
   * The chat window belongs to the app shell, not to this page — that is what
   * lets a pinned conversation follow the user off the project. This page only
   * drives it: it opens it, it keeps the title in step with a rename, and it
   * takes it down again on the way out *unless* the user has pinned it.
   */
  const openChat = useChatDock((state) => state.open);
  const closeChat = useChatDock((state) => state.close);
  const syncChatName = useChatDock((state) => state.syncName);
  const isChatOpen = useChatDock(
    (state) => state.isOpen && state.projectId === projectId,
  );
  const chatUnread = useProjectChatUnread(projectId);
  // Warm the conversation while the user is reading the board.
  usePrefetchProjectChat(projectId);

  const { data: project, isLoading } = useProject(projectId);
  /*
   * `isPlaceholderData` is the whole point of reading it here.
   *
   * The board now paints from whatever tasks the app already held (see
   * `seedTasksFor`), which on a project is only ever the current user's own —
   * the dashboard had no reason to fetch the rest of the roster's. So the list
   * on screen is real but knowingly short until the request lands, and this
   * flag is what lets the surface say so instead of quietly growing.
   */
  const {
    data: tasks = [],
    isPlaceholderData: tasksArePartial,
    isLoading: tasksLoading,
  } = useTasks({ ...filters, projectId });

  /*
   * Derived up here rather than after the loading guard below, because the
   * prefetch is a hook and hooks cannot sit behind an early return. Optional
   * chaining covers the render where `project` has not arrived: the prefetch
   * simply skips the invitations half until it has, and re-runs when it does.
   */
  const canManage = project?.myRole === 'OWNER' || project?.myRole === 'ADMIN';
  // Renaming, re-colouring and deleting are the owner's alone — see
  // `ProjectSettingsDialog` for why this is stricter than the API.
  const isOwner = project?.myRole === 'OWNER';

  // Warm the roster tab while the user is reading the board.
  usePrefetchProjectCollaboration(projectId, canManage);

  /*
   * The calendar, read here rather than inside its own tab.
   *
   * Two surfaces want it — the meetings tab and the text board, where a page
   * can be the minutes of a meeting and the "where does this go" picker has to
   * list the ones still open. Holding it at the page means one request feeds
   * both, and both open full rather than spending a round trip empty.
   *
   * The subscription sits here for the same reason: a colleague posting a
   * meeting should land on the calendar whichever tab happens to be open, and
   * one listener per project page is one listener.
   */
  useProjectMeetingsRealtime(projectId);
  const { data: meetings = [] } = useProjectMeetings(projectId);

  const togglePin = useTogglePin();
  const updateStatus = useUpdateTaskStatus();
  const toggleCompletion = useToggleMyCompletion(currentUser?.id);
  const toggleTaskPin = useToggleTaskPin();
  const deleteTask = useDeleteTask();

  const { layout, setLayout, options: layoutOptions } = useTaskLayout('project');

  useEffect(() => {
    if (projectId && project?.name) syncChatName(projectId, project.name);
  }, [project?.name, projectId, syncChatName]);

  // Leaving the project closes its chat — unless the pin is in, which is the
  // entire point of the pin.
  useEffect(
    () => () => {
      const dock = useChatDock.getState();
      if (!dock.isPinned) dock.close();
    },
    [],
  );

  // One object shared by every layout, so switching shape never changes what a
  // card can do — and so a new view is a rendering decision, not a rewiring.
  // Keyed off the `mutate` functions rather than the mutation objects: React
  // Query hands back a fresh object every render, so depending on those would
  // rebuild this every time and defeat the memo on the cards below.
  const taskHandlers = useMemo(
    () => ({
      onOpen: (task: Task) => setDetailTaskId(task.id),
      onToggleComplete: (task: Task) =>
        toggleCompletion.mutate({ taskId: task.id, completed: !task.isCompletedByMe }),
      onTogglePin: (task: Task) =>
        toggleTaskPin.mutate({ taskId: task.id, pinned: !task.isPinned }),
      onDelete: (task: Task) => deleteTask.mutate(task.id),
    }),
    [deleteTask.mutate, toggleCompletion.mutate, toggleTaskPin.mutate],
  );

  if (isLoading || !project || !projectId) return <PageLoader label={t('project.opening')} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <span
              aria-hidden
              className="mt-1 h-9 w-1.5 rounded-full sm:h-10"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
                <span>
                  {project.myRole.toLowerCase()} · {project.roster.length} member(s)
                </span>

                {/* Which company this belongs to. A link rather than a label:
                    the company page is the fastest route to the sibling
                    projects, the shared calendar and the people — which is the
                    reason to have filed it there in the first place.

                    Straight to that company rather than to the list of them:
                    the reader already knows which one, and the list would be a
                    step they have to take before getting anywhere. */}
                {project.organization && (
                  <Link
                    to={`/organizations/${project.organization.id}`}
                    title={t('org.filedUnder', { name: project.organization.name })}
                    className="inline-flex items-center gap-1 rounded-full border border-edge px-1.5 py-0.5 normal-case tracking-normal transition-colors hover:border-brand/50 hover:text-content"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.organization.color }}
                    />
                    <span className="max-w-[10rem] truncate">
                      {project.organization.name}
                    </span>
                  </Link>
                )}
              </p>
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {project.name}
              </h1>
              {project.description && (
                <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-content-muted sm:line-clamp-none">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="mr-1 hidden -space-x-2 sm:flex">
              {project.roster.slice(0, 5).map((member) => (
                <Avatar
                  key={member.id}
                  name={member.displayName}
                  src={member.avatarUrl}
                  size="sm"
                />
              ))}
            </div>

            {/* The launcher lives here rather than in a floating bubble, which
                used to sit on top of whichever tab was open. The window it
                opens is mounted by the shell — pin it and it stays with you
                after you leave this page. */}
            <Button
              variant={isChatOpen ? 'primary' : 'outline'}
              size="sm"
              onClick={() =>
                isChatOpen ? closeChat() : openChat(projectId, project.name)
              }
              className="relative"
              aria-pressed={isChatOpen}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chat</span>
              {chatUnread > 0 && !isChatOpen && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t(project.isPinned ? 'project.unpinProject' : 'project.pinProject')}
              onClick={() => togglePin.mutate({ projectId, pinned: !project.isPinned })}
              className={cn(project.isPinned && 'text-brand')}
            >
              <Pin className={cn('h-4 w-4', project.isPinned && 'fill-current')} />
            </Button>

            {/* Next to the pin, because both are things you do *to* the project
                rather than inside it. */}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('project.settingsTitle')}
                title={t('project.settingsTitle')}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}

            {canManage && (
              <Button
                onClick={() => {
                  setComposerTask(null);
                  setIsComposerOpen(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                <span className="hidden sm:inline">{t('project.newTask')}</span>
                <span className="sm:hidden">{t('project.newTaskShort')}</span>
              </Button>
            )}
          </div>
        </div>

        <Segmented
          value={tab}
          options={TABS.map((entry) => ({ ...entry, label: t(entry.label) }))}
          onChange={setTab}
          className="flex-wrap"
        />
      </header>

      {tab === 'board' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TaskFilters value={filters} onChange={setFilters} />
            <LayoutSwitcher
              value={layout}
              options={layoutOptions}
              onChange={setLayout}
              className="ml-auto"
            />
          </div>

          {layout === 'board' && (
            <TaskBoard
              tasks={tasks}
              onStatusChange={(taskId, status) => updateStatus.mutate({ taskId, status })}
              {...taskHandlers}
              // Mirrors the API rule exactly: assignees, or an owner/admin.
              canChangeStatus={(task) => task.isMine || canManage}
              // …and a shared task still needs everybody's tick before it can
              // be called finished, unless an admin overrules it.
              completionBlock={(task) =>
                completionBlockedReason(task, {
                  isAdmin: canManage,
                  currentUserId: currentUser?.id,
                })
              }
            />
          )}
          {layout === 'sprint' && <TaskSprintView tasks={tasks} {...taskHandlers} />}
          {layout === 'list' && <TaskListView tasks={tasks} {...taskHandlers} />}
          {layout === 'calendar' && <TaskCalendarView tasks={tasks} {...taskHandlers} />}

          {/* The roster's work, still in flight. See `PendingTasks`. */}
          {(tasksArePartial || tasksLoading) && (
            <PendingTasks compact={layout === 'list'} />
          )}
        </div>
      )}

      {tab === 'dashboard' && <ProjectDashboard projectId={projectId} />}
      {tab === 'roster' && <RosterPanel projectId={projectId} canManage={canManage} />}
      {tab === 'meetings' && (
        <MeetingsPanel projectId={projectId} roster={project.roster} canManage={canManage} />
      )}
      {tab === 'whiteboard' && <Whiteboard projectId={projectId} canClear={canManage} />}
      {tab === 'text' && <TextBoard projectId={projectId} tasks={tasks} meetings={meetings} />}
      {tab === 'ai' && <AiPanel projectId={projectId} />}

      <TaskComposer
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setComposerTask(null);
        }}
        projectId={projectId}
        roster={project.roster}
        task={composerTask}
      />

      {isOwner && (
        <ProjectSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          project={project}
        />
      )}

      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onEdit={(task) => {
          setDetailTaskId(null);
          setComposerTask(task);
          setIsComposerOpen(true);
        }}
      />
    </div>
  );
};

export default ProjectPage;

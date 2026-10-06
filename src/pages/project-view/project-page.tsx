import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Columns3,
  FileText,
  History,
  KanbanSquare,
  MessageCircle,
  PenTool,
  Pin,
  Plus,
  Settings2,
  Sparkles,
  Users,
  UsersRound,
  Plug,
  Radio,
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
import { GroupsBoard } from '@/features/task-groups/ui/groups-board';
import { useChatDock } from '@/features/project-chat-dock/model/chat-dock.store';
import {
  useProjectChatUnread,
  usePrefetchProjectChat,
} from '@/features/project-chat-dock/ui/chat-dock';
import { useProjectThreadUnread } from '@/entities/task-comment/model/queries';
import { useLiveCallStore } from '@/features/live-rooms/model/live-call.store';
import { LivePanel } from '@/features/live-rooms/ui/live-panel';
import { MeetingsPanel } from '@/features/meetings/ui/meetings-panel';
import { ProjectSettingsDialog } from '@/features/project-management/ui/project-settings-dialog';
import {
  useFigmaAvailability,
  useProjectMarksRealtime,
} from '@/entities/integration/model/queries';
import { FigmaLink } from '@/features/project-management/ui/figma-link';
import { RepositoryLink } from '@/features/project-management/ui/repository-link';
import { RosterPanel } from '@/features/roster/ui/roster-panel';
import { TeamsPanel } from '@/features/teams/ui/teams-panel';
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
import { ProjectWindowChip } from '@/entities/project/ui/project-window-chip';
import { ConnectionsPanel } from '@/features/connections/ui/connections-panel';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/dates';
import { Avatar, Button, LavaButton, PageLoader, PostItMark, Segmented } from '@/shared/ui';
import { ProjectChangelog } from '@/widgets/project-changelog/ui/project-changelog';
import { ProjectDashboard } from '@/widgets/project-dashboard/ui/project-dashboard';
import { TextBoard } from '@/widgets/text-board/ui/text-board';
import { Whiteboard } from '@/widgets/whiteboard/ui/whiteboard';
import { useT, type TranslationKey } from '@/shared/i18n';

type Tab =
  | 'board'
  | 'groups'
  | 'dashboard'
  | 'roster'
  | 'teams'
  | 'meetings'
  | 'live'
  | 'whiteboard'
  | 'text'
  | 'connections'
  | 'changelog'
  | 'ai';

const TABS: { value: Tab; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'board', label: 'project.tabBoard', icon: <KanbanSquare className="h-3 w-3" /> },
  // Next to the board, because it *is* the board — the same tasks, grouped by a label the project
  // invented instead of by the state they are in.
  { value: 'groups', label: 'project.tabGroups', icon: <Columns3 className="h-3 w-3" /> },
  { value: 'dashboard', label: 'project.tabMetrics', icon: <BarChart3 className="h-3 w-3" /> },
  { value: 'roster', label: 'project.tabRoster', icon: <Users className="h-3 w-3" /> },
  // Beside the roster, because a team is a subset of it — the same reasoning
  // that puts the company's teams tab next to its staff list.
  { value: 'teams', label: 'project.tabTeams', icon: <UsersRound className="h-3 w-3" /> },
  // Next to the roster rather than to the board: a meeting is an appointment between people, and
  // the question it answers is "who, and when" — not "what state is this work in".
  { value: 'meetings', label: 'project.tabMeetings', icon: <CalendarDays className="h-3 w-3" /> },
  // Immediately after the calendar, because the pair is the point. A meeting is an appointment — a
  // time, a place, a list of people expected.
  { value: 'live', label: 'project.tabLive', icon: <Radio className="h-3 w-3" /> },
  { value: 'whiteboard', label: 'project.tabWhiteboard', icon: <PenTool className="h-3 w-3" /> },
  // Next to the whiteboard on purpose: the two are the same idea in different
  // materials — one is what the project draws, the other is what it writes.
  { value: 'text', label: 'project.tabText', icon: <FileText className="h-3 w-3" /> },
  // Second from last, and never first. A changelog is what you open when something has already gone
  // wrong or gone missing — "when did that task disappear", "who let this person in".
  { value: 'connections', label: 'project.tabConnections', icon: <Plug className="h-3 w-3" /> },
  { value: 'changelog', label: 'project.tabChangelog', icon: <History className="h-3 w-3" /> },
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
  // Keeps the two marks beside the project's name honest for the whole room. Both link services
  // have always announced themselves on the socket and nothing was listening.
  useProjectMarksRealtime(projectId);

  // Whether this deployment can offer Figma at all — an environment question, not a project one,
  // and cached for an hour.
  const figmaAvailability = useFigmaAvailability();

  const currentUser = useCurrentUser();

  // The open tab lives in the URL, not in state.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // A call in this project outlives the Live tab being shown. The panel used to mount only while
  // its tab was open, so pressing "Board" mid-call unmounted the stage and hung up.
  const liveCall = useLiveCallStore((state) => state.active);
  const isInCallHere = liveCall !== null && liveCall.projectId === projectId;
  const tab: Tab = TABS.some((entry) => entry.value === tabParam)
    ? (tabParam as Tab)
    : 'board';

  const setTab = (next: Tab) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'board') params.delete('tab');
        else params.set('tab', next);
        // The page named by `?doc=` belongs to the visit that arrived on it,
        // not to every tab the reader visits afterwards.
        params.delete('doc');
        return params;
      },
      { replace: true },
    );
  };

  const [filters, setFilters] = useState<ListTasksParams>({ scope: 'all' });
  const [composerTask, setComposerTask] = useState<Task | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // A task named in the URL opens its sheet on arrival. This is how the dashboard's "up next" list
  // lands somewhere useful: a task there belongs to some project the reader may not have open.
  const taskParam = searchParams.get('task');

  useEffect(() => {
    if (!taskParam) return;

    setDetailTaskId(taskParam);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.delete('task');
        return params;
      },
      { replace: true },
    );
  }, [setSearchParams, taskParam]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // The chat window belongs to the app shell, not to this page — that is what lets a pinned
  // conversation follow the user off the project.
  const openChat = useChatDock((state) => state.open);
  const closeChat = useChatDock((state) => state.close);
  const syncChatName = useChatDock((state) => state.syncName);
  const isChatOpen = useChatDock(
    (state) => state.isOpen && state.projectId === projectId,
  );
  // Live chat that arrived while the window was shut, plus unseen task-thread comments.
  const chatUnread = useProjectChatUnread(projectId) + useProjectThreadUnread(projectId);
  // Warm the conversation while the user is reading the board.
  usePrefetchProjectChat(projectId);

  const { data: project, isLoading } = useProject(projectId);
  // `isPlaceholderData` is the whole point of reading it here. The board now paints from whatever
  // tasks the app already held (see `seedTasksFor`).
  const {
    data: tasks = [],
    isPlaceholderData: tasksArePartial,
    isLoading: tasksLoading,
  } = useTasks({ ...filters, projectId });

  // Derived up here rather than after the loading guard below, because the prefetch is a hook and
  // hooks cannot sit behind an early return.
  const canManage = project?.myRole === 'OWNER' || project?.myRole === 'ADMIN';
  // Deleting is still the owner's alone; editing is not. The settings dialog used to open for the
  // owner only, which was stricter than the API has ever been.
  const isOwner = project?.myRole === 'OWNER';
  /** Concluded: readable everywhere, writable nowhere. See `project.completedAt`. */
  const isFinished = Boolean(project?.completedAt);

  // Warm the roster tab while the user is reading the board.
  usePrefetchProjectCollaboration(projectId, canManage);

  // The calendar, read here rather than inside its own tab. Two surfaces want it — the meetings tab
  // and the text board.
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

  // `?chat=open` — how a mention notification arrives here. The bell deep-links to the project with
  // this set (see its `deepLink`), because the conversation is a floating dock rather than a route.
  useEffect(() => {
    if (searchParams.get('chat') !== 'open') return;
    if (!projectId || !project?.name) return;

    openChat(projectId, project.name);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('chat');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, projectId, project?.name, openChat]);

  // Leaving the project closes its chat — unless the pin is in, which is the
  // entire point of the pin.
  useEffect(
    () => () => {
      const dock = useChatDock.getState();
      if (!dock.isPinned) dock.close();
    },
    [],
  );

  // One object shared by every layout, so switching shape never changes what a card can do — and so
  // a new view is a rendering decision, not a rewiring.
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
              <p className="flex flex-wrap items-center gap-x-1.5 text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
                <span>
                  {project.myRole.toLowerCase()} · {project.roster.length} member(s)
                </span>

                {/* Which company this belongs to. A link rather than a label: the company page
                    is the fastest route to the sibling projects. */}
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

                {/* When the project is meant to run from and to. On the same line as the role
                    and the company because it is the same kind of fact. */}
                <ProjectWindowChip
                  startsAt={project.startsAt}
                  endsAt={project.endsAt}
                  isFinished={isFinished}
                  className="normal-case tracking-normal"
                />
              </p>
              {/* The name, and the way to the code beside it. `min-w-0` on the heading so the
                  repository button never gets squeezed out by a long project name. */}
              <div className="flex items-center gap-1.5">
                <h1 className="ui-project-name ui-project-name--hero min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {project.name}
                </h1>
                <RepositoryLink
                  projectId={projectId}
                  repository={project.repository}
                  canManage={canManage}
                />
                {/* The design, beside the code. Two halves of the same question — where does
                    this project's work actually live. */}
                <FigmaLink
                  projectId={projectId}
                  figma={project.figma}
                  canManage={canManage}
                  isAvailable={Boolean(figmaAvailability.data?.available)}
                />
              </div>
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

            {/* The launcher lives here rather than in a floating bubble, which used to sit on
                top of whichever tab was open. */}
            {/* The unread Post-it hangs off the button's corner, outside it: inside, `Button`
                would seat it on the label. */}
            <span className="relative inline-flex">
              <Button
                variant={isChatOpen ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  isChatOpen ? closeChat() : openChat(projectId, project.name)
                }
                aria-pressed={isChatOpen}
                aria-label={
                  chatUnread > 0 && !isChatOpen
                    ? `Chat — ${t('chat.unreadCount', { count: String(chatUnread) })}`
                    : undefined
                }
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
              {chatUnread > 0 && !isChatOpen && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-2.5 text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
                >
                  <PostItMark count={chatUnread} className="h-5 w-5" />
                </span>
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t(project.isPinned ? 'project.unpinProject' : 'project.pinProject')}
              onClick={() => togglePin.mutate({ projectId, pinned: !project.isPinned })}
              className={cn(project.isPinned && 'text-brand')}
            >
              <Pin className={cn('h-4 w-4', project.isPinned && 'fill-current')} />
            </Button>

            {/* Next to the pin, because both are things you do *to* the project rather than
                inside it. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('project.settingsTitle')}
              title={t('project.settingsTitle')}
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>

            {/* A finished project takes no new work — the API refuses the write either way, so
                the button is absent rather than present and rejected. */}
            {canManage && !isFinished && (
              /* The one action this whole screen exists to support, so it is
                 the other button that carries the moving fill. See `LavaButton`. */
              <LavaButton
                onClick={() => {
                  setComposerTask(null);
                  setIsComposerOpen(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                <span className="hidden sm:inline">{t('project.newTask')}</span>
                <span className="sm:hidden">{t('project.newTaskShort')}</span>
              </LavaButton>
            )}
          </div>
        </div>

        {/* Said once, at the top, rather than by disabling forty controls. A finished project
            still reads normally — that is the point of finishing rather than deleting. */}
        {isFinished && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-surface-sunken px-3.5 py-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-positive" />
            <span className="text-2xs leading-relaxed text-content-muted">
              {t('project.finishedBanner')}
            </span>
            {project.completedAt && (
              <span className="text-2xs text-content-faint">
                · {t('project.finishedOn', { date: formatDateTime(project.completedAt) })}
              </span>
            )}
          </div>
        )}

        <Segmented
          value={tab}
          options={TABS
            /* The connections tab is not merely disabled for members, it is absent. Every
               destination this posts to treats its URL as the credential. */
            .filter((entry) => entry.value !== 'connections' || canManage)
            .map((entry) => ({
              ...entry,
              label: t(entry.label),
              // A live dot on the Live tab while its call carries on behind another one, so the way
              // back is obvious.
              icon:
                entry.value === 'live' && isInCallHere ? (
                  <span className="relative inline-flex h-2.5 w-2.5" title={t('live.inCall')}>
                    <span className="absolute inset-0 rounded-full bg-positive opacity-60 motion-safe:animate-ping" />
                    <span className="relative m-auto h-2 w-2 rounded-full bg-positive" />
                  </span>
                ) : (
                  entry.icon
                ),
            }))}
          onChange={setTab}
          label={t('project.tabsLabel')}
          /* The one segmented control in the app made of glass. */
          variant="glass"
          /* The larger step, and the only place in the app that asks for it. This strip is where
             every visit to a project starts and it was drawn at filter size. */
          size="lg"
          /* A scrolling strip on a phone, a wrapping row above it. Twelve tabs wrapped is four or
             five stacked rows on a 390px screen. */
          className={cn(
            'flex w-full flex-nowrap overflow-x-auto',
            'sm:inline-flex sm:w-auto sm:flex-wrap sm:overflow-visible',
          )}
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
              /* Two waits, two weights. `tasksLoading` is a cold board with nothing painted yet, so
                 each column gets two cards' worth of grey and looks like a board loading. */
              pendingPerColumn={tasksLoading ? 2 : tasksArePartial ? 1 : 0}
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
              // The same rule as the header's "New task": whoever may add work,
              // on a project that still takes it.
              onAddTask={
                canManage && !isFinished
                  ? () => {
                      setComposerTask(null);
                      setIsComposerOpen(true);
                    }
                  : undefined
              }
            />
          )}
          {layout === 'sprint' && <TaskSprintView tasks={tasks} {...taskHandlers} />}
          {layout === 'list' && <TaskListView tasks={tasks} {...taskHandlers} />}
          {layout === 'calendar' && <TaskCalendarView tasks={tasks} {...taskHandlers} />}

          {/* The roster's work, still in flight. */}
          {layout !== 'board' && (tasksArePartial || tasksLoading) && (
            <PendingTasks compact={layout === 'list'} />
          )}
        </div>
      )}

      {/* The same tasks, grouped by a label the project invented. Given the project id and a
          way to open a task, and nothing else. */}
      {tab === 'groups' && projectId && (
        <GroupsBoard
          /* Keyed on the project, so moving between two of them starts the board over. The route is
             the same and only the parameter changes. */
          key={projectId}
          projectId={projectId}
          // For the composer the board's own "+" opens, with the column
          // already locked in — see `lockedGroupId` on `TaskComposer`.
          roster={project.roster}
          projectDeadline={project.endsAt}
          repository={project.repository}
          onOpenTask={setDetailTaskId}
        />
      )}

      {tab === 'dashboard' && <ProjectDashboard projectId={projectId} />}
      {tab === 'roster' && (
        <RosterPanel projectId={projectId} canManage={canManage} isOwner={isOwner} />
      )}
      {tab === 'teams' && (
        <TeamsPanel
          scope={{ projectId }}
          roster={project.roster}
          canManage={canManage}
        />
      )}
      {tab === 'meetings' && (
        <MeetingsPanel projectId={projectId} roster={project.roster} canManage={canManage} />
      )}
      {projectId && (tab === 'live' || isInCallHere) && (
        /* A real box, not `contents`: the page's `space-y` margin is ignored on a `contents` box.
           The `hidden` attribute (not class) also drops it out of that spacing while a call runs. */
        <div hidden={tab !== 'live'}>
          <LivePanel
            projectId={projectId}
            initialRoomId={searchParams.get('room')}
            /* A concluded project stops accepting new work, and a call is
               work. The rooms already on it stay readable and joinable. */
            canCreate={!isFinished}
            onOpenDocument={(documentId) =>
              setSearchParams(
                (params) => {
                  params.set('tab', 'text');
                  params.set('doc', documentId);
                  params.delete('room');
                  return params;
                },
                { replace: true },
              )
            }
          />
        </div>
      )}
      {tab === 'whiteboard' && <Whiteboard projectId={projectId} canClear={canManage} />}
      {tab === 'text' && (
        <TextBoard
          projectId={projectId}
          tasks={tasks}
          meetings={meetings}
          roster={project.roster}
          initialDocumentId={searchParams.get('doc') ?? undefined}
          figma={project.figma}
        />
      )}
      {tab === 'connections' && (
        <ConnectionsPanel
          projectId={projectId}
          repository={project.repository}
          figma={project.figma}
          canManage={canManage}
        />
      )}
      {tab === 'changelog' && <ProjectChangelog projectId={projectId} />}
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
        projectDeadline={project.endsAt}
        repository={project.repository}
      />

      <ProjectSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={project}
        isOwner={isOwner}
        canEdit={canManage}
      />

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

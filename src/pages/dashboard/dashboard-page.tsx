import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Archive,
  ArrowRight,
  Building2,
  CalendarClock,
  FolderPlus,
  Layers,
  ListTodo,
  Pin,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { useOrganizations } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import {
  useProjects,
  useTogglePin,
  useUserOverview,
} from '@/entities/project/model/queries';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { useTasks, useToggleMyCompletion, useToggleTaskPin } from '@/entities/task/model/queries';
import { TaskCard } from '@/entities/task/ui/task-card';
import { CreateProjectDialog } from '@/features/project-management/ui/create-project-dialog';
import type { Task } from '@/entities/task/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Button, EmptyState, RunicText, Section, Skeleton, Switch } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * What a counter is *about*, in colour. Semantic rather than decorative: finishing work is the
 * green outcome and running late is the red one.
 */
const TONES = {
  open: 'bg-brand/12 text-brand',
  done: 'bg-positive/12 text-positive',
  late: 'bg-danger/12 text-danger',
} as const;

/**
 * One counter on the masthead: a number at rest, a sentence on approach. Four labelled tiles were
 * four lines of small uppercase text competing with the greeting beside them.
 */
const StatTile = ({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
}) => {
  const t = useT();

  return (
    <div
      className={cn(
        'group/stat flex items-center gap-2.5 rounded-xl border border-edge/70 bg-surface/80',
        'px-3 py-2.5 transition-colors duration-200 ease-studio hover:border-edge',
      )}
    >
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', TONES[tone])}>
        {icon}
      </span>

      <p className="shrink-0 text-lg font-semibold leading-tight tabular-nums">{value}</p>

      <div
        className={cn(
          'grid min-w-0 grid-cols-[1fr] transition-[grid-template-columns] duration-200 ease-studio',
          '[@media(hover:hover)]:grid-cols-[0fr]',
          '[@media(hover:hover)]:group-hover/stat:grid-cols-[1fr]',
          '[@media(hover:hover)]:group-focus-within/stat:grid-cols-[1fr]',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="truncate pl-0.5 text-3xs uppercase tracking-wide text-content-faint">
            {label}
          </span>
          {/* The arrow is the only thing here that goes anywhere. Every one of these counters
              is a slice of the same list — the personal task menu. */}
          <Link
            to="/tasks"
            aria-label={t('dash.openTaskMenuFor', { label })}
            title={t('dash.openTaskMenu')}
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-lg text-content-faint',
              'transition-colors hover:bg-brand/12 hover:text-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            )}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * One company, at the size a dashboard can afford to give it. Deliberately a row and not the card
 * the organizations page draws.
 */
const OrganizationTile = ({ organization }: { organization: Organization }) => {
  const t = useT();

  return (
    <Link
      to={`/organizations/${organization.id}`}
      className={cn(
        'ui-card group flex items-center gap-3 rounded-xl border border-edge bg-surface-raised px-3 py-2.5',
        'transition-colors duration-150 hover:border-brand/50',
      )}
      style={{
        background: `linear-gradient(120deg, ${withAlpha(organization.color, 0.08)}, transparent 60%)`,
      }}
    >
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{
          backgroundColor: withAlpha(organization.color, 0.16),
          color: organization.color,
        }}
      >
        <Building2 className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold transition-colors group-hover:text-brand">
          {organization.name}
        </span>
        <span className="flex items-center gap-1.5 text-2xs text-content-faint">
          <Users className="h-3 w-3 shrink-0" />
          <span className="tabular-nums">{organization.memberCount}</span>
          <span aria-hidden>·</span>
          <span className="truncate">
            {t('org.projectCount', { count: organization.projectCount })}
          </span>
        </span>
      </span>

      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-content-faint transition-colors group-hover:text-brand" />
    </Link>
  );
};

/**
 * The greeting, with the reader's own name picked out of it. The name is coloured and sits on a
 * soft brand wash — the highlighter idiom.
 */
const Greeting = ({ name }: { name: string }) => {
  const t = useT();
  const [before, after = ''] = t('dash.greeting').split('{name}');

  return (
    <h1 className="ui-greeting text-balance text-xl font-semibold tracking-tight sm:text-2xl">
      {before}
      <span className="relative whitespace-nowrap">
        {/* The wash is behind the name by *document order*, not by a negative z-index. `-z-10`
            would have been the obvious way to write this and is the fragile one. */}
        <span
          aria-hidden
          className="absolute inset-x-[-0.2em] bottom-0 top-[0.15em] rounded-[0.25em] bg-brand/12"
        />
        <span className="relative text-brand">{name}</span>
      </span>
      {after}
    </h1>
  );
};

/**
 * Home surface: who you are, where things stand, the projects you are on, and the work that is due
 * next across all of them.
 */
/**
 * How many of the reader's open tasks are pulled back to choose six from. Wide enough that the
 * ordering below has something to order — the API's own `dueAt ASC` puts undated work last.
 */
const UP_NEXT_FETCH = 30;

/** How many actually get drawn. */
const UP_NEXT_SHOWN = 6;

/** The reader's open work, in the order somebody asking "what next" means. */
const rankUpNext = (tasks: Task[]): Task[] => {
  const now = Date.now();

  const band = (task: Task): number => {
    if (!task.dueAt) return 2;
    return Date.parse(task.dueAt) < now ? 0 : 1;
  };

  return [...tasks]
    .sort((left, right) => {
      const bands = band(left) - band(right);
      if (bands !== 0) return bands;

      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;

      // Inside a dated band, by deadline. Inside the undated one, by age.
      if (left.dueAt && right.dueAt) {
        return Date.parse(left.dueAt) - Date.parse(right.dueAt);
      }
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    })
    .slice(0, UP_NEXT_SHOWN);
};

const DashboardPage = () => {
  const t = useT();
  const user = useCurrentUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading } = useUserOverview();
  // Archived projects are off by default, and reachable. Archiving has existed on the server since
  // the model was written — `isArchived` on the row, `includeArchived` on the list query.
  const [showArchived, setShowArchived] = useState(false);
  const { data: projects = [], isLoading: projectsLoading } = useProjects(
    showArchived ? { includeArchived: true } : {},
  );
  const { data: organizations = [] } = useOrganizations();
  // "Up next for you", and the two things that were wrong with how it asked.
  const { data: openTasks = [] } = useTasks({
    scope: 'mine',
    hideCompleted: true,
    limit: UP_NEXT_FETCH,
  });

  const myTasks = useMemo(() => rankUpNext(openTasks), [openTasks]);

  // Opening a task from here means leaving here. These cards were inert — the whole row of "what is
  // on you next" was a read-only list, and the only way to act on any of it was to remember.
  const openTask = useCallback(
    (task: Task) => {
      navigate(
        task.project ? `/projects/${task.project.id}?task=${task.id}` : '/tasks',
      );
    },
    [navigate],
  );

  const togglePin = useTogglePin();
  const toggleTaskPin = useToggleTaskPin();
  const toggleCompletion = useToggleMyCompletion(user?.id);

  /** Pinned first, everything else in the order the API sent. */
  const ordered = useMemo(() => {
    // The switch is a *filter*, not an inclusion. `includeArchived: true` is the widest question
    // the API answers — every project.
    const visible = showArchived
      ? projects.filter((project) => project.isArchived)
      : projects;

    return [...visible].sort(
      (left, right) => Number(right.isPinned) - Number(left.isPinned),
    );
  }, [projects, showArchived]);

  const firstName = user?.displayName.split(' ')[0] ?? t('dash.greetingFallback');

  return (
    /* The trailing space is room for the bottom row to open into. */
    <div className="space-y-5 pb-2 sm:space-y-6 [@media(hover:hover)]:pb-40">
      {/* --- The masthead ------------------------------------------------ */}
      <header className="panel board-grid relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6">
        {/* The brand bloom that used to sit off the top-right corner has gone. It was there to
            stop the masthead opening on a flat rectangle. */}

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 space-y-1">
            {/* The eyebrow over the title. Carved on the runic skin — the heading underneath
                says the same thing in Latin, so nothing is lost. */}
            <p className="text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
              <RunicText mode="always">{t('dash.title')}</RunicText>
            </p>
            <Greeting name={firstName} />
            <p className="hidden text-sm text-content-muted sm:block">{t('dash.subtitle')}</p>
          </div>

          {/* Three counters, not four. The project count left this row entirely: it is a
              property of the list two sections down, not a statistic about the reader's day. */}
          <div className="flex shrink-0 flex-wrap justify-start gap-2 lg:justify-end">
            {overviewLoading || !overview ? (
              Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-[3.625rem] w-[6.5rem] rounded-xl" />
              ))
            ) : (
              <>
                <StatTile
                  label={t('dash.openTasks')}
                  value={overview.openTasks}
                  icon={<ListTodo className="h-4 w-4" />}
                  tone="open"
                />
                <StatTile
                  label={t('dash.completed')}
                  value={overview.completedTasks}
                  icon={<CalendarClock className="h-4 w-4" />}
                  tone="done"
                />
                <StatTile
                  label={t('dash.overdue')}
                  value={overview.overdueTasks}
                  icon={<TriangleAlert className="h-4 w-4" />}
                  tone="late"
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* --- The work, and the rail beside it ---------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 xl:gap-7">
        <Section
          className="min-w-0"
          title={
            <span className="flex items-baseline gap-1.5">
              {t('dash.yourProjects')}
              {/* The count the masthead used to carry, returned to the thing it counts. Hidden
                  while the list is still loading rather than shown as `(0)`. */}
              {!projectsLoading && (
                <span className="text-xs font-normal tabular-nums text-content-faint">
                  ({ordered.length})
                </span>
              )}
            </span>
          }
          action={
            <div className="flex items-center gap-3">
              {/* Always drawn, and the first draft of this was not. */}
              <Switch
                id="show-archived"
                checked={showArchived}
                onChange={setShowArchived}
                label={t('dash.showArchived')}
                className="text-2xs text-content-muted"
              />
              <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
                <FolderPlus className="h-3.5 w-3.5" />
                {t('dash.newProject')}
              </Button>
            </div>
          }
        >
          {projectsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-[6.5rem]" />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            /* Two empty states, because they are two different facts. "No projects yet" with a
               button that makes one is right for somebody who has never created anything. */
            showArchived ? (
              <EmptyState
                icon={<Archive className="h-6 w-6" />}
                title={t('dash.noArchived')}
                description={t('dash.noArchivedBody')}
              />
            ) : (
              <EmptyState
                icon={<Layers className="h-6 w-6" />}
                title={t('dash.noProjects')}
                description={t('dash.noProjectsBody')}
                action={
                  <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    {t('dash.createProject')}
                  </Button>
                }
              />
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {ordered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onTogglePin={() =>
                      togglePin.mutate({ projectId: project.id, pinned: !project.isPinned })
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Section>

        <aside className="min-w-0 space-y-5 lg:space-y-6">
          <Section
            title={t('dash.upNext')}
            action={
              <Link to="/tasks" className="text-xs font-medium text-brand hover:underline">
                {t('dash.openTaskMenu')}
              </Link>
            }
          >
            {myTasks.length === 0 ? (
              <EmptyState
                className="px-4 py-8"
                icon={<Pin className="h-5 w-5" />}
                title={t('dash.nothingAssigned')}
                description={t('dash.nothingAssignedBody')}
              />
            ) : (
              <div className="grid gap-2.5">
                {myTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    compact
                    onOpen={openTask}
                    /* These come from every project at once, so the card has to say which one —
                       otherwise "Draft the brief" appears twice with no way to tell the two apart. */
                    showProjectLink
                    onToggleComplete={() =>
                      toggleCompletion.mutate({
                        taskId: task.id,
                        completed: !task.isCompletedByMe,
                      })
                    }
                    onTogglePin={() =>
                      toggleTaskPin.mutate({ taskId: task.id, pinned: !task.isPinned })
                    }
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Where you belong, in the rail rather than above the work. Rendered only when there
              is something to show. */}
          {organizations.length > 0 && (
            <Section
              title={t('org.title')}
              action={
                <Link
                  to="/organizations"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {t('dash.openOrganizations')}
                </Link>
              }
            >
              <div className="grid gap-2.5">
                {organizations.map((organization) => (
                  <OrganizationTile key={organization.id} organization={organization} />
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>

      <CreateProjectDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};

export default DashboardPage;

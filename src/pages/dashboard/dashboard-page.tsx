import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
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
import { Button, EmptyState, RunicText, Section, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * What a counter is *about*, in colour.
 *
 * Semantic rather than decorative: finishing work is the green outcome and
 * running late is the red one, and a reader who has learned that anywhere else
 * in the app already knows it here. `open` keeps the brand accent because
 * "still to do" is the neutral state — it is the work, not a verdict on it.
 *
 * Overdue is red whether or not anything is overdue. The colour classifies the
 * *category*; the number underneath it reports the state, and "0" in a red
 * well is unambiguous in a way that a well which changes colour behind your
 * back is not.
 */
const TONES = {
  open: 'bg-brand/12 text-brand',
  done: 'bg-positive/12 text-positive',
  late: 'bg-danger/12 text-danger',
} as const;

/**
 * One counter on the masthead: a number at rest, a sentence on approach.
 *
 * ## Why the label hides
 *
 * Four labelled tiles were four lines of small uppercase text competing with
 * the greeting beside them, and none of it is read twice — "OPEN TASKS" tells
 * you nothing the second time you see it, while the number changes daily. So
 * the resting state is the icon and the figure, and the words come back when
 * the pointer arrives and somebody is actually asking what they mean.
 *
 * The reveal is `grid-template-columns: 0fr → 1fr`, the same mechanism the
 * project cards use: no JavaScript, no measurement, and it animates correctly
 * whatever the translated label turns out to be. `prefers-reduced-motion`
 * flattens it through the global rule.
 *
 * Where there is **no hover** — a phone — the label is simply always on. That
 * is what `@media (hover: hover)` gates: a control whose meaning is only
 * reachable by an interaction the device cannot perform is not a design, it is
 * a lockout.
 *
 * Sunken rather than raised, because it sits *inside* the plate. A raised card
 * on a raised panel is two shadows arguing; an inset well reads as something
 * stamped into the plate, which is what a counter on a masthead is.
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
          {/*
            The arrow is the only thing here that goes anywhere.

            Every one of these counters is a slice of the same list — the
            personal task menu — so the tile does not need three destinations,
            it needs one, and it is worth reaching only once somebody has
            leaned in far enough to read the label. It keeps its own accessible
            name because "→" announced on its own is not a destination.
          */}
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
 * One company, at the size a dashboard can afford to give it.
 *
 * Deliberately a row and not the card the organizations page draws. This
 * surface already carries four counters, a grid of project cards and a task
 * list; a second grid of full-height cards with banners and bylines would push
 * the work — which is what anybody opened the dashboard for — below the fold.
 *
 * So it says the three things that decide whether to click: which company, how
 * many people, how much work. Everything else is one navigation away.
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
 * The greeting, with the reader's own name picked out of it.
 *
 * The name is coloured and sits on a soft brand wash — the highlighter idiom,
 * which is the right one on a surface built out of paper and Post-its, and the
 * cheapest way to make a line that every user sees feel addressed to *this*
 * one rather than generated for anybody.
 *
 * The sentence is split on the raw `{name}` token rather than assembled from
 * two half-sentence keys. Word order is not the same in every language — a
 * `greetingBefore` / `greetingAfter` pair would have quietly forced English
 * order onto every translation — and splitting the template keeps the whole
 * sentence in one string where a translator can see it.
 */
const Greeting = ({ name }: { name: string }) => {
  const t = useT();
  const [before, after = ''] = t('dash.greeting').split('{name}');

  return (
    <h1 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
      {before}
      <span className="relative whitespace-nowrap">
        {/*
          The wash is behind the name by *document order*, not by a negative
          z-index.

          `-z-10` would have been the obvious way to write this and is the
          fragile one: neither the plate nor the flex wrapper above establishes
          a stacking context, so a negatively-stacked descendant is free to
          paint behind the plate's own background and vanish entirely. Two
          positioned siblings at the same level need no z-index at all — the
          later one wins — and that holds wherever this heading is dropped.
        */}
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
 * Home surface: who you are, where things stand, the projects you are on, and
 * the work that is due next across all of them.
 *
 * ## The shape of the page
 *
 * A masthead plate, then two columns: the projects on the left and a rail on
 * the right carrying what is on you next and the companies you belong to.
 *
 * It used to be five full-width sections stacked down the page, which on a
 * wide screen meant a column of content roughly 1400px across with nothing
 * beside it, and "what is on me next" — arguably the single most useful thing
 * here — below three sections of chrome. The rail puts it beside the projects
 * instead of under them, and the projects themselves are now collapsed cards
 * (see `ProjectCard`), so the whole surface fits a screen where it used to
 * take two.
 *
 * ## Pinned projects
 *
 * There is no pinned section any more. It was a second grid of the same
 * component, above a heading that then had to rename itself ("All projects"
 * when something was pinned, "Your projects" when not) — two lists, two
 * headings and a conditional title to express *an ordering*. Pinned projects
 * sort to the front of the one list, which is what pinning already means
 * everywhere else in the app, and the pin on the card says which they are.
 */
/**
 * How many of the reader's open tasks are pulled back to choose six from.
 *
 * Wide enough that the ordering below has something to order — the API's own
 * `dueAt ASC` puts undated work last, so a narrow window is a window with no
 * undated tasks in it — and small enough to stay a cheap request. Thirty rows
 * is a few kilobytes and covers anybody who is not drowning.
 */
const UP_NEXT_FETCH = 30;

/** How many actually get drawn. */
const UP_NEXT_SHOWN = 6;

/**
 * The reader's open work, in the order somebody asking "what next" means.
 *
 * Three bands, and the order between them is the whole point:
 *
 *   1. **Overdue**, most overdue first. Nothing else competes with a deadline
 *      that has already passed.
 *   2. **Dated and still ahead**, soonest first.
 *   3. **Undated**, newest first. This band is the fix: the API sorts these
 *      last and a truncated list therefore never showed one, which made a task
 *      created without a deadline invisible on the dashboard. Newest first
 *      inside the band because a task somebody just wrote is the one they are
 *      most likely to be looking for.
 *
 * Pinned work jumps to the front of whichever band it is in — pinning means
 * "keep this in front of me" everywhere else in the app, and a pin that did
 * nothing here would be the odd one out.
 */
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
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: organizations = [] } = useOrganizations();
  /*
   * "Up next for you", and the two things that were wrong with how it asked.
   *
   * It used to fetch `{ scope: 'mine', status: 'TODO', limit: 6 }`, which had
   * two separate ways of hiding work the reader had every reason to expect:
   *
   *  1. **`status: 'TODO'` excluded everything in progress.** Moving a card to
   *     "In progress" — the exact moment it becomes the thing you are doing
   *     next — took it out of the list called "up next for you". `hideCompleted`
   *     says what was actually meant: everything still open.
   *
   *  2. **`limit: 6` truncated an ordering that exiles undated work.** The API
   *     orders by `dueAt` ascending and Postgres sorts NULLs *last*, so a task
   *     with no deadline sits behind every task that has one. Create a task
   *     without setting a due date — which is the default in the composer — and
   *     with six dated tasks already open, it never appears at all. That is the
   *     "I made a task and it isn't there" case exactly.
   *
   * So the window is fetched wide and cut here instead. Ordering "up next" is a
   * judgement this surface makes and no other one shares — the task menu buckets
   * by day, the board groups by column — so it belongs to the surface rather
   * than to a shared endpoint whose ordering every other caller depends on.
   */
  const { data: openTasks = [] } = useTasks({
    scope: 'mine',
    hideCompleted: true,
    limit: UP_NEXT_FETCH,
  });

  const myTasks = useMemo(() => rankUpNext(openTasks), [openTasks]);

  /*
   * Opening a task from here means leaving here.
   *
   * These cards were inert — the whole row of "what is on you next" was a
   * read-only list, and the only way to act on any of it was to remember which
   * project it belonged to and navigate there by hand. A task's home is its
   * project's board, so that is where this goes, carrying the task id so the
   * sheet opens on arrival rather than dropping the reader at the top of a
   * board to go and find it again. See `ProjectPage`'s `?task=` handling.
   *
   * A *personal* task has no project and therefore no board; the task menu is
   * its only home, so that is where it goes instead.
   */
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

  /**
   * Pinned first, everything else in the order the API sent.
   *
   * `sort` is stable in every engine this app runs on, so a plain
   * pinned-minus-pinned comparator preserves the server's ordering *within*
   * each half rather than reshuffling projects that are equally pinned. That
   * matters because the list is otherwise sorted by the API, and a comparator
   * that reordered ties would make the grid jump every time a pin was toggled.
   */
  const ordered = useMemo(
    () => [...projects].sort((left, right) => Number(right.isPinned) - Number(left.isPinned)),
    [projects],
  );

  const firstName = user?.displayName.split(' ')[0] ?? t('dash.greetingFallback');

  return (
    /*
      The trailing space is room for the bottom row to open into.

      A card's detail panel is absolutely positioned below it (see
      `ProjectCard`), so on the last row it opens past the end of the page —
      either clipped by the viewport or, worse, growing the scroll container
      for exactly as long as the pointer rests there, which makes a scrollbar
      appear and disappear under the mouse.

      Reserved only where there is a pointer to open it with: `hover: hover`
      excludes touch, whose layout has no panel to make room for. On a
      dashboard the space at the foot of the page costs nothing anyway.
    */
    <div className="space-y-5 pb-2 sm:space-y-6 [@media(hover:hover)]:pb-40">
      {/* --- The masthead ------------------------------------------------ */}
      <header className="panel board-grid relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6">
        {/*
          One brand bloom, off the top-right corner.

          The whole plate is otherwise flat, and a dashboard that opens on a
          flat rectangle is the shape of every admin template ever shipped.
          A single blurred wash costs one composited layer, tints with the
          skin because it is the brand token, and is the only decoration on
          the page that is not also information.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 space-y-1">
            {/* The eyebrow over the title. Carved on the runic skin — the
                heading underneath says the same thing in Latin, so nothing
                is lost. */}
            <p className="text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
              <RunicText mode="always">{t('dash.title')}</RunicText>
            </p>
            <Greeting name={firstName} />
            <p className="hidden text-sm text-content-muted sm:block">{t('dash.subtitle')}</p>
          </div>

          {/*
            Three counters, not four.

            The project count left this row entirely: it is a property of the
            list two sections down, not a statistic about the reader's day, and
            it now sits in that section's own heading where the thing it counts
            is directly underneath it.

            A flex row rather than a grid, because the tiles no longer have a
            fixed size — each one grows when the pointer reaches it (see
            `StatTile`) and its neighbours give up the space. A grid with fixed
            tracks would have clipped the reveal instead. `flex-wrap` is the
            safety net for the narrowest desktop, where three expanded tiles
            plus the greeting genuinely do not fit on one line.
          */}
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
              {/*
                The count the masthead used to carry, returned to the thing it
                counts. Hidden while the list is still loading rather than
                shown as `(0)`, which would be a wrong answer rather than an
                absent one.
              */}
              {!projectsLoading && (
                <span className="text-xs font-normal tabular-nums text-content-faint">
                  ({ordered.length})
                </span>
              )}
            </span>
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              {t('dash.newProject')}
            </Button>
          }
        >
          {projectsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-[6.5rem]" />
              ))}
            </div>
          ) : ordered.length === 0 ? (
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
                    /* These come from every project at once, so the card has to
                       say which one — otherwise "Draft the brief" appears twice
                       with no way to tell the two apart. */
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

          {/*
            Where you belong, in the rail rather than above the work.

            Rendered only when there is something to show. Somebody who runs no
            company should not be given a permanent empty section explaining a
            feature they have not asked for — the same rule the team picker
            follows.
          */}
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

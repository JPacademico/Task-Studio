import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

const StatTile = ({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'warning';
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2.5 rounded-2xl border border-edge bg-surface-raised px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3.5"
  >
    <span
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-9 sm:w-9',
        tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-brand/12 text-brand',
      )}
    >
      {icon}
    </span>
    <div className="min-w-0 leading-tight">
      <p className="text-base font-semibold tabular-nums sm:text-lg">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-content-faint sm:text-[11px]">
        {label}
      </p>
    </div>
  </motion.div>
);

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
        'ui-card group flex items-center gap-3 rounded-2xl border border-edge bg-surface-raised px-3 py-2.5',
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
        <span className="flex items-center gap-1.5 text-[11px] text-content-faint">
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
 * Home surface: personal counters, the companies the user belongs to, pinned
 * projects, and the work that is due next across every project they are on.
 */
const DashboardPage = () => {
  const t = useT();
  const user = useCurrentUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading } = useUserOverview();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: organizations = [] } = useOrganizations();
  const { data: myTasks = [] } = useTasks({ scope: 'mine', status: 'TODO', limit: 6 });

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

  const pinned = projects.filter((project) => project.isPinned);
  const others = projects.filter((project) => !project.isPinned);
  const firstName = user?.displayName.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-5 sm:space-y-8">
      <header className="space-y-0.5 sm:space-y-1">
        {/* The eyebrow over the title. Carved on the runic skin — the heading
            underneath says the same thing in Latin, so nothing is lost. */}
        <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
          <RunicText mode="always">{t('dash.title')}</RunicText>
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Good to see you, {firstName}.
        </h1>
        <p className="hidden text-sm text-content-muted sm:block">
          {t('dash.subtitle')}
        </p>
      </header>

      {/* Two across on a phone: four stacked tiles was most of the first screen. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {overviewLoading || !overview ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[58px]" />)
        ) : (
          <>
            <StatTile label={t('dash.openTasks')} value={overview.openTasks} icon={<ListTodo className="h-4 w-4" />} />
            <StatTile
              label={t('dash.completed')}
              value={overview.completedTasks}
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatTile
              label={t('dash.overdue')}
              value={overview.overdueTasks}
              icon={<TriangleAlert className="h-4 w-4" />}
              tone={overview.overdueTasks > 0 ? 'warning' : 'default'}
            />
            <StatTile label={t('dash.projects')} value={overview.projects} icon={<Layers className="h-4 w-4" />} />
          </>
        )}
      </div>

      {/*
        Where you belong, above what you are working on.

        Rendered only when there is something to show. Somebody who runs no
        company should not be given a permanent empty section explaining a
        feature they have not asked for — the same rule the team picker follows.
      */}
      {organizations.length > 0 && (
        <Section
          title={t('org.title')}
          action={
            <Link to="/organizations" className="text-xs font-medium text-brand hover:underline">
              {t('dash.openOrganizations')}
            </Link>
          }
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((organization) => (
              <OrganizationTile key={organization.id} organization={organization} />
            ))}
          </div>
        </Section>
      )}

      {pinned.length > 0 && (
        <Section title={t('dash.pinnedProjects')}>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {pinned.map((project) => (
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
        </Section>
      )}

      <Section
        title={t(pinned.length > 0 ? 'dash.allProjects' : 'dash.yourProjects')}
        action={
          <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" />
            {t('dash.newProject')}
          </Button>
        }
      >
        {projectsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[228px]" />
            ))}
          </div>
        ) : others.length === 0 && pinned.length === 0 ? (
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
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {others.map((project) => (
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
            icon={<Pin className="h-5 w-5" />}
            title={t('dash.nothingAssigned')}
            description={t('dash.nothingAssignedBody')}
          />
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
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

      <CreateProjectDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};

export default DashboardPage;

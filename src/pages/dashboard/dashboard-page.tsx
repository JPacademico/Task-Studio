import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, FolderPlus, Layers, ListTodo, Pin, TriangleAlert } from 'lucide-react';

import {
  useProjects,
  useTogglePin,
  useUserOverview,
} from '@/entities/project/model/queries';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { useTasks, useToggleMyCompletion, useToggleTaskPin } from '@/entities/task/model/queries';
import { TaskCard } from '@/entities/task/ui/task-card';
import { CreateProjectDialog } from '@/features/project-management/ui/create-project-dialog';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { Button, EmptyState, Section, Skeleton } from '@/shared/ui';

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
 * Home surface: personal counters, pinned projects, and the work that is due
 * next across every project the user belongs to.
 */
const DashboardPage = () => {
  const user = useCurrentUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useUserOverview();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: myTasks = [] } = useTasks({ scope: 'mine', status: 'TODO', limit: 6 });

  const togglePin = useTogglePin();
  const toggleTaskPin = useToggleTaskPin();
  const toggleCompletion = useToggleMyCompletion();

  const pinned = projects.filter((project) => project.isPinned);
  const others = projects.filter((project) => !project.isPinned);
  const firstName = user?.displayName.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-5 sm:space-y-8">
      <header className="space-y-0.5 sm:space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
          Dashboard
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Good to see you, {firstName}.
        </h1>
        <p className="hidden text-sm text-content-muted sm:block">
          Everything you own and everything assigned to you, in one place.
        </p>
      </header>

      {/* Two across on a phone: four stacked tiles was most of the first screen. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {overviewLoading || !overview ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[58px]" />)
        ) : (
          <>
            <StatTile label="Open tasks" value={overview.openTasks} icon={<ListTodo className="h-4 w-4" />} />
            <StatTile
              label="Completed"
              value={overview.completedTasks}
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatTile
              label="Overdue"
              value={overview.overdueTasks}
              icon={<TriangleAlert className="h-4 w-4" />}
              tone={overview.overdueTasks > 0 ? 'warning' : 'default'}
            />
            <StatTile label="Projects" value={overview.projects} icon={<Layers className="h-4 w-4" />} />
          </>
        )}
      </div>

      {pinned.length > 0 && (
        <Section
          title="Pinned projects"
          description="Kept at the top, in your own order."
        >
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
        title={pinned.length > 0 ? 'All projects' : 'Your projects'}
        action={
          <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" />
            New project
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
            title="No projects yet"
            description="Create your first project, then invite people into its roster."
            action={
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                Create a project
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
        title="Up next for you"
        description="Open tasks assigned to you across every project."
        action={
          <Link to="/tasks" className="text-xs font-medium text-brand hover:underline">
            Open task menu
          </Link>
        }
      >
        {myTasks.length === 0 ? (
          <EmptyState
            icon={<Pin className="h-5 w-5" />}
            title="Nothing assigned to you"
            description="When a project owner assigns you work, it shows up here."
          />
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                compact
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

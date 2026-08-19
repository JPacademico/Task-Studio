import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderKanban, Plus, TriangleAlert } from 'lucide-react';

import { useProjects } from '@/entities/project/model/queries';
import type { ProjectListItem } from '@/entities/project/model/types';
import { useTearOff } from '@/features/floating-shortcuts/lib/use-tear-off';
import { useFloatingShortcuts } from '@/features/floating-shortcuts/model/shortcuts.store';
import { TearOffGhost } from '@/features/floating-shortcuts/ui/tear-off-ghost';
import { cn } from '@/shared/lib/cn';
import { formatDeadline } from '@/shared/lib/dates';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useNavPreferences } from '@/shared/lib/nav-preferences.store';
import { useEdgeReveal } from '@/shared/lib/use-edge-reveal';
import {
  AutumnHedge,
  Button,
  EdgeAffordance,
  EldritchTendrils,
  NavGlyph,
  NavPinButton,
  Skeleton,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface ProjectRailProps {
  onCreateProject: () => void;
}

/** The soonest thing this project needs from the user, if anything. */
const urgencyOf = (project: ProjectListItem): string | null =>
  project.myNextDueAt ?? project.nextDueAt;

/**
 * A project row, and — on a pointer device — something you can pull off the
 * rail to keep one project reachable from anywhere without pinning the whole
 * panel open.
 */
const RailProject = ({
  project,
  onTearingChange,
}: {
  project: ProjectListItem;
  onTearingChange: (isTearing: boolean) => void;
}) => {
  const t = useT();
  const to = `/projects/${project.id}`;
  const addShortcut = useFloatingShortcuts((state) => state.add);
  const isPinnedOut = useFloatingShortcuts((state) =>
    state.items.some((entry) => entry.id === `project:${to}`),
  );

  const { bind, ghost } = useTearOff({
    onTearOff: (point) =>
      addShortcut({
        id: `project:${to}`,
        kind: 'project',
        to,
        label: project.name,
        icon: 'project',
        color: project.color,
        x: point.x - 90,
        y: point.y - 22,
      }),
  });

  useEffect(() => onTearingChange(Boolean(ghost)), [ghost, onTearingChange]);

  const due = urgencyOf(project);
  const isOverdue = project.overdueTaskCount > 0;

  return (
    <>
      <NavLink
        to={to}
        title={t('rail.dragToPin')}
        {...bind}
        className={({ isActive }) =>
          cn(
            'group flex cursor-grab select-none items-center gap-2.5 rounded-2xl border px-2.5 py-2',
            'transition-colors duration-150 active:cursor-grabbing',
            isActive
              ? 'border-brand/30 bg-brand/12'
              : 'border-transparent hover:border-edge hover:bg-surface-sunken/70',
          )
        }
      >
        <span
          aria-hidden
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />

        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">{project.name}</span>
            {isOverdue && (
              <TriangleAlert
                className="h-3 w-3 shrink-0 text-danger"
                aria-label={`${project.overdueTaskCount} overdue`}
              />
            )}
          </span>
          <span
            className={cn(
              'block truncate text-[10px]',
              isOverdue ? 'text-danger' : 'text-content-faint',
            )}
          >
            {due ? formatDeadline(due) : t('rail.noDeadline')} · {project.openTaskCount}{' '}
            {t('rail.openCount')}
          </span>
        </span>

        {isPinnedOut && (
          <span
            aria-hidden
            title={t('rail.pinnedHint')}
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
          />
        )}

        {project.isPinned && (
          <span
            aria-hidden
            title={t('rail.pinnedProject')}
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-content-faint"
          />
        )}
      </NavLink>

      <TearOffGhost
        point={ghost}
        label={project.name}
        icon={FolderKanban}
        color={project.color}
      />
    </>
  );
};

export const ProjectRail = ({ onCreateProject }: ProjectRailProps) => {
  const t = useT();
  const isTouch = useIsTouchDevice();

  const isPinned = useNavPreferences((state) => state.pinned.right);
  const togglePin = useNavPreferences((state) => state.togglePin);

  const [isTearing, setIsTearing] = useState(false);

  const { isRevealed, pin, unpin, close } = useEdgeReveal({
    edge: 'right',
    threshold: 22,
    hideDistance: 300,
    enabled: !isTouch,
    locked: isPinned || isTearing,
  });

  // Server-side ordering: whatever is due soonest for this user comes first.
  const { data: projects = [], isLoading } = useProjects({ sort: 'deadline' });

  // Hover-revealed chrome has no place on touch, where there is no hover.
  if (isTouch) return null;

  return (
    <>
      <EdgeAffordance
        edge="right"
        isHidden={!isRevealed}
        label={t('rail.hoverHint')}
      />

      <motion.aside
        onMouseEnter={pin}
        onMouseLeave={() => {
          // A project being pulled off the rail must not take the rail with it.
          if (isTearing) return;
          unpin();
          close();
        }}
        initial={false}
        animate={{ x: isRevealed ? 0 : 'calc(100% + 12px)' }}
        transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.7 }}
        className={cn(
          'nav-rail nav-rail--right ui-textured gpu fixed right-0 top-0 z-50 flex h-full w-[260px] flex-col',
          'safe-t safe-b safe-r',
          // See the note on the left rail: a full-height blur that animates is
          // the most expensive thing on the page, and at 95% opacity nobody
          // can tell it apart from a cheaper one.
          'border-l border-edge bg-surface-raised/95 backdrop-blur-md',
          'bg-[radial-gradient(120%_60%_at_100%_0%,rgb(var(--brand)/0.16),transparent_62%)]',
          'shadow-[-8px_0_40px_-24px_rgb(0_0_0/0.65)]',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-brand/45 to-transparent"
        />

        <EldritchTendrils edge="right" isActive={isRevealed} />
        <AutumnHedge edge="right" isActive={isRevealed} />

        <header className="flex items-center gap-2 px-4 pb-3 pt-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
            <NavGlyph glyph="project" fallback={FolderKanban} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold tracking-tight">{t('dash.projects')}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-content-faint">
              {t('rail.soonestFirst')}
            </p>
          </div>
          <NavPinButton isPinned={isPinned} onToggle={() => togglePin('right')} />
        </header>

        <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
          {isLoading &&
            Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[58px] rounded-2xl" />
            ))}

          {!isLoading && projects.length === 0 && (
            <p className="px-3 py-6 text-center text-xs leading-relaxed text-content-faint">
              {t('rail.noProjects')}
            </p>
          )}

          {projects.map((project) => (
            <RailProject key={project.id} project={project} onTearingChange={setIsTearing} />
          ))}
        </div>

        <footer className="border-t border-edge/70 p-3">
          <Button variant="secondary" size="sm" onClick={onCreateProject} className="w-full">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
            {t('dash.newProject')}
          </Button>
        </footer>
      </motion.aside>
    </>
  );
};

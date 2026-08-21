import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, FolderKanban, Plus, TriangleAlert, Users } from 'lucide-react';

import { useOrganizations } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { useProjectIntentPrefetch, useProjects } from '@/entities/project/model/queries';
import type { ProjectListItem } from '@/entities/project/model/types';
import { useTearOff } from '@/features/floating-shortcuts/lib/use-tear-off';
import { useFloatingShortcuts } from '@/features/floating-shortcuts/model/shortcuts.store';
import { TearOffGhost } from '@/features/floating-shortcuts/ui/tear-off-ghost';
import { cn } from '@/shared/lib/cn';
import { formatDeadline } from '@/shared/lib/dates';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { TOP_BAR_PX } from '@/shared/config/constants';
import { useNavPreferences, type RailScope } from '@/shared/lib/nav-preferences.store';
import { useEdgeReveal, useReleaseAfterTearOff } from '@/shared/lib/use-edge-reveal';
import {
  AutumnHedge,
  Button,
  EdgeAffordance,
  EldritchTendrils,
  NavGlyph,
  NavPinButton,
  Segmented,
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
  // Same destination as the dashboard card, so they share one cooldown.
  const intent = useProjectIntentPrefetch(project.id);
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
        {...intent}
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

/**
 * A company on the rail.
 *
 * Deliberately plainer than `RailProject`, and not because it was cheaper. A
 * project row can be torn off into a floating shortcut because a project is a
 * place people return to a dozen times a day; a company is somewhere you go to
 * check on things, and a torn-off shortcut to one would be clutter with a
 * gesture attached. The row says the two numbers that decide whether it is
 * worth opening — how many people, how much work — and links.
 */
const RailOrganization = ({ organization }: { organization: Organization }) => {
  const t = useT();

  return (
    <NavLink
      to={`/organizations/${organization.id}`}
      className={({ isActive }) =>
        cn(
          'group flex select-none items-center gap-2.5 rounded-2xl border px-2.5 py-2',
          'transition-colors duration-150',
          isActive
            ? 'border-brand/30 bg-brand/12'
            : 'border-transparent hover:border-edge hover:bg-surface-sunken/70',
        )
      }
    >
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
        style={{
          backgroundColor: `${organization.color}22`,
          color: organization.color,
        }}
      >
        <Building2 className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-xs font-semibold">{organization.name}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-content-faint">
          <Users className="h-2.5 w-2.5 shrink-0" />
          <span className="tabular-nums">{organization.memberCount}</span>
          <span aria-hidden>·</span>
          <span className="truncate">
            {t('org.projectCount', { count: organization.projectCount })}
          </span>
        </span>
      </span>
    </NavLink>
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
    /*
     * The top bar is not a way in.
     *
     * The account avatar, the theme toggle and the notification bell all live
     * within a few pixels of the right edge of the screen, and overshooting any
     * of them used to open this rail over the page. Coming down the right edge
     * from below the bar still works, which is the gesture the rail is for.
     */
    keepOut: { top: TOP_BAR_PX },
  });

  useReleaseAfterTearOff(isTearing, { unpin, close });

  const scope = useNavPreferences((state) => state.railScope);
  const setScope = useNavPreferences((state) => state.setRailScope);

  // Server-side ordering: whatever is due soonest for this user comes first.
  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    sort: 'deadline',
  });

  /*
   * The companies, fetched only once somebody has switched to them.
   *
   * The rail is on every page and mounts on every load, so its queries are the
   * ones most worth being careful about. Somebody who has never touched the
   * toggle — which is most people, since projects is the default — never pays
   * for this request at all, and somebody who has is on a device where the
   * choice is already remembered. See `useNavPreferences`.
   */
  const { data: organizations = [], isLoading: organizationsLoading } = useOrganizations(
    scope === 'organizations',
  );
  const isProjects = scope === 'projects';
  const isLoading = isProjects ? projectsLoading : organizationsLoading;
  const isEmpty = (isProjects ? projects.length : organizations.length) === 0;

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

        <header className="space-y-2.5 px-4 pb-3 pt-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
              {isProjects ? (
                <NavGlyph glyph="project" fallback={FolderKanban} className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold tracking-tight">
                {t(isProjects ? 'dash.projects' : 'org.title')}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-content-faint">
                {t(isProjects ? 'rail.soonestFirst' : 'rail.yourCompanies')}
              </p>
            </div>
            <NavPinButton isPinned={isPinned} onToggle={() => togglePin('right')} />
          </div>

          {/*
            What the rail is a list of.

            In the header rather than a menu behind the pin, because it changes
            the entire contents of the panel — a control that swaps everything
            below it should be visible above everything below it. Projects
            first, and default: it is what the rail has always been, and a
            company is somewhere you visit rather than somewhere you work.
          */}
          <Segmented
            value={scope}
            onChange={setScope}
            // Two halves rather than two content-sized pills: the labels differ
            // in length in every language, and an off-centre split reads as a
            // rendering accident on a control this small.
            className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2"
            options={[
              {
                value: 'projects' as RailScope,
                label: t('dash.projects'),
                icon: <FolderKanban className="h-3 w-3" />,
              },
              {
                value: 'organizations' as RailScope,
                label: t('org.title'),
                icon: <Building2 className="h-3 w-3" />,
              },
            ]}
          />
        </header>

        <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
          {isLoading &&
            Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[58px] rounded-2xl" />
            ))}

          {!isLoading && isEmpty && (
            <p className="px-3 py-6 text-center text-xs leading-relaxed text-content-faint">
              {t(isProjects ? 'rail.noProjects' : 'rail.noOrganizations')}
            </p>
          )}

          {isProjects
            ? projects.map((project) => (
                <RailProject
                  key={project.id}
                  project={project}
                  onTearingChange={setIsTearing}
                />
              ))
            : organizations.map((organization) => (
                <RailOrganization key={organization.id} organization={organization} />
              ))}
        </div>

        <footer className="border-t border-edge/70 p-3">
          {/*
            The footer follows the list, because "new" has to mean the thing
            being looked at. Creating a company needs the dialog on the
            organizations page — it asks for projects and people, not just a
            name — so this links there rather than opening a second copy of it
            from a 260px rail.
          */}
          {isProjects ? (
            <Button variant="secondary" size="sm" onClick={onCreateProject} className="w-full">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              {t('dash.newProject')}
            </Button>
          ) : (
            <NavLink
              to="/organizations"
              className={cn(
                'ui-btn flex h-8 w-full items-center justify-center gap-1.5 rounded-xl',
                'bg-surface-sunken px-3 text-xs text-content transition-colors hover:bg-edge/60',
              )}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              {t('org.new')}
            </NavLink>
          )}
        </footer>
      </motion.aside>
    </>
  );
};

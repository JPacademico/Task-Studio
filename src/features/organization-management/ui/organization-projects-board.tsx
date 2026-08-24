import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FolderPlus, Lock, Plus, Search, TriangleAlert, X } from 'lucide-react';

import {
  useAttachableProjects,
  useAttachProject,
  useDetachProject,
} from '@/entities/organization/model/queries';
import type {
  Organization,
  OrganizationProject,
  OrganizationProjectMetrics,
} from '@/entities/organization/model/types';
import { useProjectIntentPrefetch } from '@/entities/project/model/queries';
import { CreateProjectDialog } from '@/features/project-management/ui/create-project-dialog';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { withAlpha } from '@/shared/lib/colors';
import { formatDeadline } from '@/shared/lib/dates';
import { Badge, Button, EmptyState, Section, Select } from '@/shared/ui';
import { useT, type Translate, type TranslationKey } from '@/shared/i18n';

/**
 * The columns a project sorts itself into.
 *
 * Derived, never set — which is the whole reason this board has no drag and
 * drop while the task board does. A task's column *is* its status, so moving
 * the card is how you change it. A project's column is a reading of its
 * deadlines, and dragging a card from "Behind" to "On track" would be a gesture
 * that either lies or does nothing.
 */
type Lane = 'at-risk' | 'active' | 'archived';

const LANES: { id: Lane; label: TranslationKey; hint: TranslationKey; accent: string }[] = [
  {
    id: 'at-risk',
    label: 'org.laneAtRisk',
    hint: 'org.laneAtRiskHint',
    accent: 'text-danger',
  },
  { id: 'active', label: 'org.laneActive', hint: 'org.laneActiveHint', accent: 'text-brand' },
  {
    id: 'archived',
    label: 'org.laneArchived',
    hint: 'org.laneArchivedHint',
    accent: 'text-content-faint',
  },
];

const laneOf = (
  project: OrganizationProject,
  metrics: OrganizationProjectMetrics | undefined,
): Lane => {
  if (project.isArchived) return 'archived';
  return (metrics?.overdue ?? 0) > 0 ? 'at-risk' : 'active';
};

interface ProjectCardProps {
  organizationId: string;
  project: OrganizationProject;
  metrics: OrganizationProjectMetrics | undefined;
  canManage: boolean;
  t: Translate;
}

/**
 * One project, as the company reads it.
 *
 * Deliberately not `entities/project/ui/project-card`. That card is drawn for
 * somebody who works on the project and answers "what do I do next"; this one
 * is drawn for somebody who runs the company and answers "does this need me" —
 * so it leads with the overdue count and the completion bar, and it has to cope
 * with being a project the reader cannot open at all.
 */
const OrganizationProjectCard = ({
  organizationId,
  project,
  metrics,
  canManage,
  t,
}: ProjectCardProps) => {
  const detach = useDetachProject(organizationId);
  const intent = useProjectIntentPrefetch(project.id);

  const overdue = metrics?.overdue ?? 0;
  const rate = metrics?.completionRate ?? 0;

  const body = (
    <>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'truncate text-sm font-semibold',
                project.hasAccess && 'transition-colors group-hover/card:text-brand',
              )}
            >
              {project.name}
            </span>
            {!project.hasAccess && (
              <Lock
                className="h-3 w-3 shrink-0 text-content-faint"
                aria-label={t('org.noAccess')}
              />
            )}
            {project.isArchived && (
              <Archive
                className="h-3 w-3 shrink-0 text-content-faint"
                aria-label={t('org.archived')}
              />
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-content-faint">
            {project.description ?? t('org.noDescription')}
          </span>
        </div>
      </div>

      {/* The numbers, which are the reason this card exists at all. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {overdue > 0 && (
            <Badge className="border-danger/40 text-danger">
              <TriangleAlert className="h-3 w-3" />
              {t('org.overdueCount', { count: overdue })}
            </Badge>
          )}
          {metrics && metrics.open > 0 && (
            <Badge>{t('org.openCount', { count: metrics.open })}</Badge>
          )}
          {metrics?.nextDueAt && <Badge>{formatDeadline(metrics.nextDueAt)}</Badge>}
          {metrics && metrics.tasks === 0 && (
            <Badge className="text-content-faint">{t('org.noTasks')}</Badge>
          )}
        </div>

        {metrics && metrics.tasks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-content-faint">
              <span>{t('org.completion')}</span>
              <span className="tabular-nums">
                {metrics.completed}/{metrics.tasks} · {rate}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 ease-studio',
                  overdue > 0 ? 'bg-warning' : 'bg-positive',
                )}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <li
      className={cn(
        'ui-card group/card relative flex flex-col gap-3 rounded-2xl border border-edge',
        'bg-surface-raised p-3 transition-shadow duration-200 hover:shadow-panel',
        project.isArchived && 'opacity-70',
      )}
      style={{
        background: `linear-gradient(125deg, ${withAlpha(project.color, 0.09)}, transparent 58%)`,
      }}
    >
      {/*
        A project the reader is not on is a card, not a link.

        The company's board lists everything the company runs — see the API's
        `visibleProjects` — so some of these lead to a page that would refuse
        them. Rendering those as links would be offering a navigation that
        dead-ends in a 404; rendering them as plain cards says "this exists, you
        are not on it" without pretending otherwise.
      */}
      {project.hasAccess ? (
        <Link
          to={`/projects/${project.id}`}
          {...intent}
          className="flex flex-col gap-3 focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        <div title={t('org.noAccessHint')} className="flex flex-col gap-3">
          {body}
        </div>
      )}

      {canManage && (
        <button
          type="button"
          aria-label={t('org.unfile', { name: project.name })}
          title={t('org.unfile', { name: project.name })}
          onClick={() => detach.mutate(project.id)}
          className={cn(
            'absolute right-1.5 top-1.5 rounded-lg p-1.5 text-content-faint',
            'opacity-0 transition-all hover:text-danger',
            'group-hover/card:opacity-100 focus-visible:opacity-100',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
};

interface OrganizationProjectsBoardProps {
  organization: Organization;
  /**
   * The metrics behind each card, when they have been fetched.
   *
   * Optional, and the board draws perfectly well without them. They come from
   * the dashboard query, which is the expensive one — so the board renders
   * immediately from the company payload it already has and fills the numbers
   * in when they land, rather than holding the whole page behind them.
   */
  metrics?: OrganizationProjectMetrics[];
}

/**
 * The company's work, as a board.
 *
 * The counterpart of a project's task board, one level up: three lanes, sorted
 * by how much attention each project is asking for. What it deliberately does
 * **not** have is drag and drop — see `Lane`. A project's lane is a reading of
 * its deadlines rather than a field anybody can set, so a draggable card would
 * be a control with nothing behind it.
 */
export const OrganizationProjectsBoard = ({
  organization,
  metrics,
}: OrganizationProjectsBoardProps) => {
  const t = useT();
  const [search, setSearch] = useState('');
  const [isFiling, setIsFiling] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const attach = useAttachProject(organization.id);
  // Only asked for while the picker is actually open — see the query.
  const { data: attachable = [] } = useAttachableProjects(isFiling);

  const metricsById = useMemo(
    () => new Map((metrics ?? []).map((entry) => [entry.id, entry])),
    [metrics],
  );

  const query = search.trim().toLowerCase();

  const lanes = useMemo(() => {
    const matches = query
      ? organization.projects.filter((project) =>
          project.name.toLowerCase().includes(query),
        )
      : organization.projects;

    const grouped = new Map<Lane, OrganizationProject[]>(
      LANES.map((lane) => [lane.id, []]),
    );

    for (const project of matches) {
      grouped.get(laneOf(project, metricsById.get(project.id)))?.push(project);
    }

    // Worst first inside a lane, so the column heading and the first card agree
    // about what the reader is being shown.
    for (const [, group] of grouped) {
      group.sort(
        (a, b) =>
          (metricsById.get(b.id)?.overdue ?? 0) - (metricsById.get(a.id)?.overdue ?? 0) ||
          a.name.localeCompare(b.name),
      );
    }

    return grouped;
  }, [metricsById, organization.projects, query]);

  const isEmpty = organization.projects.length === 0;

  return (
    <div className="space-y-4">
      <div className="ui-textured flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2 sm:p-3">
        <label className="relative min-w-[10rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(clampText(event.target.value, TEXT_LIMITS.search))}
            placeholder={t('org.searchProjects')}
            aria-label={t('org.searchProjects')}
            maxLength={TEXT_LIMITS.search}
            className="field h-9 py-0 pl-9 text-xs"
          />
        </label>

        {/*
          Filing is an admin's, and only over projects they own — see the API's
          `OrganizationsService`. So the picker is hidden entirely for everybody
          else rather than shown and then failing.
        */}
        {organization.canManage && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {/*
              Two different acts, and the order says which is the common one.

              "New project" makes one that belongs here from the first second —
              no picker, because being on this page has already answered the
              question. "File a project" is for work that already exists
              somewhere else and is being moved in, which is the rarer errand
              and therefore the quieter button.
            */}
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t('org.newProject')}
            </Button>

            {isFiling ? (
              <>
                <Select
                  className="w-[13rem]"
                  value=""
                  onChange={(projectId) => {
                    if (!projectId) return;
                    attach.mutate(projectId, { onSuccess: () => setIsFiling(false) });
                  }}
                  options={[
                    { value: '', label: t('org.chooseProject') },
                    ...attachable.map((project) => ({
                      value: project.id,
                      label: project.name,
                      swatch: project.color,
                    })),
                  ]}
                />
                <Button size="sm" variant="ghost" onClick={() => setIsFiling(false)}>
                  {t('common.cancel')}
                </Button>
                {attachable.length === 0 && (
                  <p className="text-[11px] text-content-faint">{t('org.nothingToFile')}</p>
                )}
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsFiling(true)}>
                <FolderPlus className="h-3.5 w-3.5" />
                {t('org.fileProject')}
              </Button>
            )}
          </div>
        )}
      </div>

      {isEmpty && (
        <EmptyState
          icon={<FolderPlus className="h-6 w-6" />}
          title={t('org.boardEmpty')}
          description={t(
            organization.canManage ? 'org.boardEmptyAdmin' : 'org.boardEmptyBody',
          )}
          action={
            organization.canManage ? (
              <Button size="sm" variant="secondary" onClick={() => setIsCreating(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                {t('org.newProject')}
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Locked to this company: the picker is not drawn, because standing on
          the page is the answer it would have asked for. */}
      {organization.canManage && (
        <CreateProjectDialog
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          organizationId={organization.id}
        />
      )}

      {!isEmpty && (
        <div className="grid gap-4 lg:grid-cols-3">
          {LANES.map((lane) => {
            const projects = lanes.get(lane.id) ?? [];

            return (
              <Section
                key={lane.id}
                title={t(lane.label)}
                description={t(lane.hint)}
                className="min-w-0"
                action={
                  <span
                    className={cn(
                      'rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                      projects.length > 0 && lane.accent,
                    )}
                  >
                    {projects.length}
                  </span>
                }
              >
                {projects.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-edge px-3 py-6 text-center text-[11px] text-content-faint">
                    {t('org.laneEmpty')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {projects.map((project) => (
                      <OrganizationProjectCard
                        key={project.id}
                        organizationId={organization.id}
                        project={project}
                        metrics={metricsById.get(project.id)}
                        canManage={organization.canManage}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
              </Section>
            );
          })}
        </div>
      )}
    </div>
  );
};

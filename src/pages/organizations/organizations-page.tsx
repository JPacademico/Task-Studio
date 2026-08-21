import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  FolderPlus,
  Plus,
  Settings2,
  X,
} from 'lucide-react';

import {
  useAttachableProjects,
  useAttachProject,
  useDetachProject,
  useOrganizations,
} from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { OrganizationDialog } from '@/features/organization-management/ui/organization-dialog';
import { useProjectIntentPrefetch } from '@/entities/project/model/queries';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Avatar, Button, EmptyState, RunicText, Select, Skeleton } from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

interface ProjectRowProps {
  organizationId: string;
  project: Organization['projects'][number];
  canUnfile: boolean;
  t: Translate;
}

/** One project inside a folder — a link out, plus the owner's unfile control. */
const ProjectRow = ({ organizationId, project, canUnfile, t }: ProjectRowProps) => {
  const detach = useDetachProject(organizationId);
  const intent = useProjectIntentPrefetch(project.id);

  return (
    <li className="group/row flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-sunken/70">
      <span
        aria-hidden
        className="h-7 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />

      <Link
        to={`/projects/${project.id}`}
        {...intent}
        className="min-w-0 flex-1 leading-tight focus-visible:outline-none"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold transition-colors group-hover/row:text-brand">
            {project.name}
          </span>
          {project.isArchived && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-content-faint">
              {t('org.archived')}
            </span>
          )}
        </span>
        <span className="block truncate text-[11px] text-content-faint">
          {project.description ?? t('org.noDescription')}
        </span>
      </Link>

      {canUnfile && (
        <button
          type="button"
          aria-label={t('org.unfile', { name: project.name })}
          title={t('org.unfile', { name: project.name })}
          onClick={() => detach.mutate(project.id)}
          className={cn(
            'shrink-0 rounded-lg p-1.5 text-content-faint opacity-0 transition-all',
            'hover:text-danger group-hover/row:opacity-100 focus-visible:opacity-100',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
};

interface OrganizationCardProps {
  organization: Organization;
  onEdit: (organization: Organization) => void;
  t: Translate;
}

/**
 * One folder, with its projects listed underneath.
 *
 * Expanded inline rather than behind a detail route. A folder holds nothing but
 * a list of links, so a page of its own would be a navigation step that arrives
 * at the same handful of rows the card can simply show — and the useful view of
 * organizations is nearly always the comparison between them.
 */
const OrganizationCard = ({ organization, onEdit, t }: OrganizationCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isFiling, setIsFiling] = useState(false);

  const attach = useAttachProject(organization.id);
  // Only asked for while the picker is actually open — see the query.
  const { data: attachable = [] } = useAttachableProjects(isFiling);

  return (
    <article
      className="ui-card overflow-hidden rounded-2xl border border-edge bg-surface-raised"
      style={{
        background: `linear-gradient(120deg, ${withAlpha(organization.color, 0.09)}, transparent 55%)`,
      }}
    >
      <header className="flex flex-wrap items-start gap-3 p-4">
        <span
          aria-hidden
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{
            backgroundColor: withAlpha(organization.color, 0.16),
            color: organization.color,
          }}
        >
          <Building2 className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            {organization.name}
          </h2>
          {organization.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-content-muted">
              {organization.description}
            </p>
          )}
          <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-content-faint">
            <Avatar
              name={organization.owner.displayName}
              src={organization.owner.avatarUrl}
              size="xs"
            />
            <span className="truncate">
              {organization.isOwner
                ? t('org.ownedByYou')
                : t('org.ownedBy', { name: organization.owner.displayName })}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {t('org.projectCount', { count: organization.projectCount })}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {organization.isOwner && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('org.editTitle')}
              title={t('org.editTitle')}
              onClick={() => onEdit(organization)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            aria-expanded={isOpen}
            aria-label={t(isOpen ? 'org.collapse' : 'org.expand')}
            onClick={() => setIsOpen((open) => !open)}
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-150', isOpen && 'rotate-180')}
            />
          </Button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-edge/70 px-2.5 py-2.5">
              {organization.projects.length > 0 ? (
                <ul className="space-y-0.5">
                  {organization.projects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      organizationId={organization.id}
                      project={project}
                      canUnfile={organization.isOwner}
                      t={t}
                    />
                  ))}
                </ul>
              ) : (
                <p className="px-2.5 py-3 text-center text-xs leading-relaxed text-content-faint">
                  {t('org.empty')}
                </p>
              )}

              {/*
                Filing is the owner's, and only over projects they own — see
                the API's `OrganizationsService`. So the picker is hidden
                entirely for everybody else rather than shown and then failing.
              */}
              {organization.isOwner && (
                <div className="px-1 pt-0.5">
                  {isFiling ? (
                    <div className="flex flex-wrap items-center gap-1.5">
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
                        <p className="text-[11px] text-content-faint">
                          {t('org.nothingToFile')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setIsFiling(true)}>
                      <FolderPlus className="h-3.5 w-3.5" />
                      {t('org.fileProject')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};

/**
 * Organizations: somewhere to put projects.
 *
 * Once somebody is on a dozen projects the flat list stops being a list and
 * starts being a pile — a client's three projects, an internal tool and last
 * year's rebuild all sitting at the same level with nothing saying which
 * belongs with which. A folder is the smallest thing that fixes that, and it is
 * deliberately *only* a folder: no roster, no permissions, no content. See
 * `entities/organization/model/types`.
 */
const OrganizationsPage = () => {
  const t = useT();

  const { data: organizations = [], isPending } = useOrganizations();
  const [editing, setEditing] = useState<Organization | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsDialogOpen(true);
  };

  const openEdit = (organization: Organization) => {
    setEditing(organization);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
            <RunicText mode="always">{t('org.eyebrow')}</RunicText>
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('org.title')}</h1>
          <p className="hidden text-sm text-content-muted sm:block">{t('org.subtitle')}</p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          {t('org.new')}
        </Button>
      </header>

      {isPending && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[120px] rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && organizations.length === 0 && (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t('org.emptyTitle')}
          description={t('org.emptyBody')}
          action={
            <Button size="sm" onClick={openCreate}>
              {t('org.new')}
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {organizations.map((organization) => (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            onEdit={openEdit}
            t={t}
          />
        ))}
      </div>

      <OrganizationDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditing(null);
        }}
        organization={editing}
      />
    </div>
  );
};

export default OrganizationsPage;

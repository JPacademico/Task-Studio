import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Lock, Plus, Settings2, Users } from 'lucide-react';

import { useOrganizations } from '@/entities/organization/model/queries';
import type { Organization } from '@/entities/organization/model/types';
import { OrganizationDialog } from '@/features/organization-management/ui/organization-dialog';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { Avatar, Button, EmptyState, RunicText, Skeleton } from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

interface OrganizationCardProps {
  organization: Organization;
  onEdit: (organization: Organization) => void;
  t: Translate;
}

/**
 * One company, as a card that leads somewhere.
 *
 * This used to expand inline, on the reasoning that a folder holds nothing but
 * a list of links and a page of its own would be a navigation step arriving at
 * the same handful of rows. That reasoning belonged to the folder. A company
 * has a projects board, a metrics page, a staff list and a calendar, and none
 * of those fit under a chevron — so the card's job is now to say enough to
 * choose between companies, and the page's job is everything else.
 *
 * What it says is deliberately the same three facts for each: how many people,
 * how much work, and whether the reader is staff or just passing through.
 */
const OrganizationCard = ({ organization, onEdit, t }: OrganizationCardProps) => (
  <article
    className="ui-card group relative overflow-hidden rounded-2xl border border-edge bg-surface-raised transition-shadow duration-200 hover:shadow-panel"
    style={{
      background: organization.bannerUrl
        ? undefined
        : `linear-gradient(120deg, ${withAlpha(organization.color, 0.09)}, transparent 55%)`,
    }}
  >
    {/* The banner as a strip, if there is one. Short: this is a chooser, and a
        full letterhead per card would push the third company off the screen. */}
    {organization.bannerUrl && (
      <span
        aria-hidden
        className="block h-16 w-full"
        style={{ background: `url(${organization.bannerUrl}) center/cover` }}
      />
    )}

    <div className="flex flex-wrap items-start gap-3 p-4">
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
        <Link
          to={`/organizations/${organization.id}`}
          className="block focus-visible:outline-none"
        >
          <h2 className="truncate text-sm font-semibold tracking-tight transition-colors group-hover:text-brand">
            {organization.name}
          </h2>
        </Link>

        {organization.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-content-muted">
            {organization.description}
          </p>
        )}

        <p className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-content-faint">
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
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users className="h-3 w-3" />
            {organization.memberCount}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {t('org.projectCount', { count: organization.projectCount })}
          </span>

          {/* A guest reached this company through a project inside it and is
              not on its staff list. Saying so on the card explains why the
              page they are about to open has fewer controls than they expect. */}
          {!organization.myRole && (
            <>
              <span aria-hidden>·</span>
              <span
                className="inline-flex items-center gap-1"
                title={t('org.guestNotice')}
              >
                <Lock className="h-3 w-3" />
                {t('org.roleGuest')}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {organization.canManage && (
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

        {/* A link, styled like the ghost icon button beside it. `Button` has
            no `asChild`, and a button that calls `navigate` would lose
            middle-click, "open in new tab" and the status-bar preview — on the
            one control whose entire job is going somewhere. */}
        <Link
          to={`/organizations/${organization.id}`}
          aria-label={t('org.open', { name: organization.name })}
          title={t('org.open', { name: organization.name })}
          className={cn(
            'ui-btn grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            'text-content-muted transition-colors hover:bg-surface-sunken hover:text-content',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          )}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </article>
);

/**
 * Organizations: the companies whose work lives in here.
 *
 * The list is a chooser and nothing more — everything a company *has* is on its
 * own page now. What this page still owns is the one act that has no page to
 * live on yet: creating one. See `OrganizationDialog` for why creation asks for
 * projects and people rather than only a name.
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
        <div className={cn('grid gap-3 md:grid-cols-2')}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[132px] rounded-2xl" />
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

      <div className="grid gap-3 md:grid-cols-2">
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

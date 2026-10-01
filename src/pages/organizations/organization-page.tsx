import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutGrid,
  Settings2,
  Users,
  UsersRound,
} from 'lucide-react';

import {
  useOrganization,
  useOrganizationDashboard,
  useOrganizationMembers,
} from '@/entities/organization/model/queries';
import { MeetingsPanel } from '@/features/meetings/ui/meetings-panel';
import { OrganizationBanner } from '@/features/organization-management/ui/organization-banner';
import { OrganizationDashboard } from '@/features/organization-management/ui/organization-dashboard';
import { OrganizationDialog } from '@/features/organization-management/ui/organization-dialog';
import { OrganizationMembersPanel } from '@/features/organization-management/ui/organization-members-panel';
import { OrganizationProjectsBoard } from '@/features/organization-management/ui/organization-projects-board';
import { TeamsPanel } from '@/features/teams/ui/teams-panel';
import { Avatar, Button, PageLoader, Segmented } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

type Tab = 'projects' | 'metrics' | 'staff' | 'teams' | 'meetings';

/**
 * Four tabs, and what is deliberately missing from them. A project page has seven: board, metrics,
 * roster, meetings, whiteboard, text and assistant.
 */
const TABS: { value: Tab; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'projects', label: 'org.tabProjects', icon: <LayoutGrid className="h-3 w-3" /> },
  { value: 'metrics', label: 'org.tabMetrics', icon: <BarChart3 className="h-3 w-3" /> },
  { value: 'staff', label: 'org.tabStaff', icon: <Users className="h-3 w-3" /> },
  // Next to the staff list rather than the projects board: a team is a subset of the people, and
  // the question it answers is "who works together", not "what are we working on".
  { value: 'teams', label: 'org.tabTeams', icon: <UsersRound className="h-3 w-3" /> },
  { value: 'meetings', label: 'org.tabMeetings', icon: <CalendarDays className="h-3 w-3" /> },
];

/**
 * What a guest is shown in place of a staff-only tab. A sentence rather than a hidden tab,
 * deliberately.
 */
const StaffOnly = ({ message }: { message: string }) => (
  <p className="rounded-2xl border border-dashed border-edge px-4 py-10 text-center text-xs leading-relaxed text-content-muted">
    {message}
  </p>
);

/**
 * One company's workspace. Shaped like the project page on purpose — banner, identity, tabs,
 * content.
 */
const OrganizationPage = () => {
  const t = useT();
  const { organizationId } = useParams<{ organizationId: string }>();

  const [tab, setTab] = useState<Tab>('projects');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: organization, isLoading } = useOrganization(organizationId);

  /**
   * Is this reader staff, or a guest who arrived through a project? The distinction decides three
   * of the four tabs.
   */
  const isStaff = Boolean(organization?.myRole);

  // The metrics, fetched once and read by two tabs. The board wants each project's overdue count to
  // sort its lanes, and the metrics tab wants all of it.
  const { data: dashboard } = useOrganizationDashboard(organizationId, isStaff);

  // The staff list, for the header's faces and the meeting composer's guest picker. Read at the
  // page rather than inside the meetings tab.
  const { data: members = [] } = useOrganizationMembers(organizationId, isStaff);

  /**
   * Projects a company meeting may be attached to. Only the ones the reader can actually see, which
   * for staff is all of them.
   */
  const linkableProjects = useMemo(
    () =>
      (organization?.projects ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
      })),
    [organization?.projects],
  );

  if (isLoading || !organization || !organizationId) {
    return <PageLoader label={t('org.opening')} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <OrganizationBanner organization={organization} />

      <header className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <span
              aria-hidden
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10"
              style={{
                backgroundColor: `${organization.color}22`,
                color: organization.color,
              }}
            >
              <Building2 className="h-4 w-4" />
            </span>

            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <p className="flex flex-wrap items-center gap-x-1.5 text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
                <Link to="/organizations" className="transition-colors hover:text-content">
                  {t('org.title')}
                </Link>
                <span aria-hidden>·</span>
                <span>
                  {organization.myRole
                    ? t(
                        organization.myRole === 'OWNER'
                          ? 'org.roleOwner'
                          : organization.myRole === 'ADMIN'
                            ? 'org.roleAdmin'
                            : 'org.roleMember',
                      )
                    : t('org.roleGuest')}
                </span>
                <span aria-hidden>·</span>
                <span className="normal-case tracking-normal">
                  {t('org.headcount', { count: organization.memberCount })}
                </span>
              </p>

              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {organization.name}
              </h1>

              {organization.description && (
                <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-content-muted sm:line-clamp-none">
                  {organization.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="mr-1 hidden -space-x-2 sm:flex">
              {members.slice(0, 5).map((member) => (
                <Avatar
                  key={member.id}
                  name={member.displayName}
                  src={member.avatarUrl}
                  size="sm"
                  title={member.jobTitle ?? member.displayName}
                />
              ))}
            </div>

            {organization.canManage && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('org.editTitle')}
                title={t('org.editTitle')}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Segmented
          value={tab}
          options={TABS.map((entry) => ({ ...entry, label: t(entry.label) }))}
          onChange={setTab}
          className="flex-wrap"
        />
      </header>

      {tab === 'projects' && (
        <OrganizationProjectsBoard
          organization={organization}
          metrics={dashboard?.projects}
        />
      )}

      {/* The three staff-only tabs. A guest is shown why rather than a spinner that resolves
          into a 404 — and, just as importantly. */}
      {tab === 'metrics' &&
        (isStaff ? (
          <OrganizationDashboard organizationId={organizationId} />
        ) : (
          <StaffOnly message={t('org.metricsStaffOnly')} />
        ))}

      {tab === 'staff' &&
        (isStaff ? (
          <OrganizationMembersPanel organization={organization} />
        ) : (
          <StaffOnly message={t('org.staffStaffOnly')} />
        ))}

      {tab === 'teams' &&
        (isStaff ? (
          <TeamsPanel
            scope={{ organizationId }}
            roster={members}
            canManage={organization.canManage}
          />
        ) : (
          <StaffOnly message={t('org.teamsStaffOnly')} />
        ))}

      {tab === 'meetings' &&
        (isStaff ? (
          <MeetingsPanel
            organizationId={organizationId}
            roster={members}
            linkableProjects={linkableProjects}
            canManage={organization.canManage}
          />
        ) : (
          <StaffOnly message={t('org.meetingsStaffOnly')} />
        ))}

      {organization.canManage && (
        <OrganizationDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          organization={organization}
        />
      )}
    </div>
  );
};

export default OrganizationPage;

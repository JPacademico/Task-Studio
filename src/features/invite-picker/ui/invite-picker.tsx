import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Search, User, Users } from 'lucide-react';

import { useTeams } from '@/entities/team/model/queries';
import type { TeamScope } from '@/entities/team/model/types';
import type { UserSummary } from '@/entities/user/model/types';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { Avatar, Segmented } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * How many faces fit before the composer stops being a form.
 *
 * Twelve is three rows of chips at the width these dialogs are, which is about
 * as much as somebody can scan without losing the shape of the page. It is
 * deliberately not "as many as fit": a company of ninety used to render ninety
 * chips, and the picker became the whole dialog — the deadline fields, the
 * colour and the submit button all pushed below the fold by a control most
 * people touch twice.
 */
const PAGE_SIZE = 12;

/** Anybody who can be named — a project roster row or a company staff row. */
type Person = UserSummary;

interface InvitePickerProps {
  /** Everybody eligible. Already scoped by the caller. */
  people: Person[];
  selectedPeople: string[];
  onTogglePerson: (userId: string) => void;

  /**
   * Which teams to offer, or `null` for a surface with none to draw from.
   *
   * The teams tab disappears entirely when this is null or the scope has no
   * teams — a permanent "no teams yet" tab is an advertisement for a feature
   * somebody has already decided not to use.
   */
  teamScope?: TeamScope | null;
  selectedTeams?: string[];
  onToggleTeam?: (teamId: string) => void;

  /** Only fetched while the dialog holding this is actually open. */
  isOpen: boolean;

  label: string;
  className?: string;
}

type Tab = 'people' | 'teams';

/**
 * Who is being invited: some people, or some teams.
 *
 * ## Why the two are one control
 *
 * They were two stacked lists — a row of team chips, then a row of every face
 * on the roster — which read as two unrelated questions and answered neither
 * well. They are the same question ("who is in on this?") asked at two
 * granularities, so they are two tabs of one control, and individuals is the
 * default because that is what most invitations are. A team is the shortcut for
 * the case where the answer happens to have a name already.
 *
 * ## Why the people list pages
 *
 * Because a company roster is unbounded and a dialog is not. See `PAGE_SIZE`.
 * Search narrows before paging does, so finding one person out of ninety is
 * typing three letters rather than clicking through eight pages — and the count
 * beside the label always reports the *whole* selection, not the page's share
 * of it, so somebody who selects two people and then searches can still see
 * that two are selected.
 *
 * Teams are not paged. A project with more than a dozen teams does not exist,
 * and a pager on a list of four is furniture.
 */
export const InvitePicker = ({
  people,
  selectedPeople,
  onTogglePerson,
  teamScope = null,
  selectedTeams = [],
  onToggleTeam,
  isOpen,
  label,
  className,
}: InvitePickerProps) => {
  const t = useT();
  const { data: teams = [] } = useTeams(teamScope, isOpen && Boolean(teamScope));

  const [tab, setTab] = useState<Tab>('people');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // A dialog is reopened, not remounted, so last time's query would otherwise
  // still be narrowing the list on a form that has been reset around it.
  useEffect(() => {
    if (!isOpen) return;
    setTab('people');
    setSearch('');
    setPage(0);
  }, [isOpen]);

  const canPickTeams = teams.length > 0 && Boolean(onToggleTeam);

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people;

    return people.filter(
      (person) =>
        person.displayName.toLowerCase().includes(needle) ||
        person.email?.toLowerCase().includes(needle),
    );
  }, [people, search]);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  // Typing can shrink the list under the page somebody is on; clamping here
  // rather than in an effect avoids a render that shows an empty page first.
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const visible = matches.slice(start, start + PAGE_SIZE);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-content-muted">
          {label}{' '}
          <span className="text-content-faint">
            ({selectedPeople.length + selectedTeams.length})
          </span>
        </p>

        {/* Only when there is a second answer to give. */}
        {canPickTeams && (
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'people' as Tab,
                label: t('invite.individually'),
                icon: <User className="h-3 w-3" />,
              },
              {
                value: 'teams' as Tab,
                label: t('invite.byTeam'),
                icon: <Users className="h-3 w-3" />,
              },
            ]}
          />
        )}
      </div>

      {tab === 'people' || !canPickTeams ? (
        <div className="space-y-2 pt-1">
          {/* The search box earns its place from about two pages onward; below
              that it is one more control on a form that has plenty. */}
          {people.length > PAGE_SIZE && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(clampText(event.target.value, TEXT_LIMITS.search));
                  setPage(0);
                }}
                placeholder={t('invite.searchPeople')}
                aria-label={t('invite.searchPeople')}
                maxLength={TEXT_LIMITS.search}
                className="field h-9 w-full pl-8 text-xs"
              />
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-3 text-center text-2xs text-content-faint">
              {t('invite.noMatches')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visible.map((person) => {
                const isSelected = selectedPeople.includes(person.id);

                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onTogglePerson(person.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border py-1 pl-2 pr-2.5 text-xs transition-all duration-150',
                      isSelected
                        ? 'border-brand bg-brand/12 text-brand'
                        : 'border-edge text-content-muted hover:border-content-faint',
                    )}
                  >
                    <Avatar name={person.displayName} src={person.avatarUrl} size="xs" />
                    <span className="max-w-[8rem] truncate">{person.displayName}</span>
                    {/* Says what the click will do, rather than only what is on. */}
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-4 w-4 place-items-center rounded-full',
                        isSelected ? 'bg-brand text-brand-contrast' : 'bg-surface-sunken',
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      ) : (
                        <Plus className="h-2.5 w-2.5" strokeWidth={3.5} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-3xs tabular-nums text-content-faint">
                {t('invite.page', {
                  from: String(start + 1),
                  to: String(Math.min(start + PAGE_SIZE, matches.length)),
                  total: String(matches.length),
                })}
              </span>

              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  aria-label={t('invite.previousPage')}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-content-muted transition-colors hover:text-content disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  aria-label={t('invite.nextPage')}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-content-muted transition-colors hover:text-content disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {teams.map((team) => {
            const isSelected = selectedTeams.includes(team.id);

            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleTeam?.(team.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-2.5 text-xs transition-all duration-150',
                  isSelected
                    ? 'border-brand bg-brand/12 text-brand'
                    : 'border-edge text-content-muted hover:border-content-faint',
                )}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="max-w-[9rem] truncate">{team.name}</span>
                <span className="shrink-0 tabular-nums text-3xs text-content-faint">
                  {team.memberCount}
                </span>
                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

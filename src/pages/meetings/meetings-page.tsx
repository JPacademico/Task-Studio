import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { CalendarRange, Clock, MapPin, Search, Users } from 'lucide-react';

import { useMyAgenda } from '@/entities/meeting/model/queries';
import type { Meeting } from '@/entities/meeting/model/types';
import { useProjects } from '@/entities/project/model/queries';
import { cn } from '@/shared/lib/cn';
import { formatDayLabel, formatTime } from '@/shared/lib/dates';
import {
  AvatarStack,
  Badge,
  EmptyState,
  RunicText,
  Select,
  Skeleton,
} from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

const dayKey = (value: string): string => format(parseISO(value), 'yyyy-MM-dd');

interface AgendaRowProps {
  meeting: Meeting;
  t: Translate;
}

/**
 * One entry on the personal agenda.
 *
 * Deliberately read-only, and that is the whole difference from the project
 * board's row. Editing, completing and deleting a meeting are owner-or-admin
 * powers *of the project it belongs to* — a rule this page cannot evaluate,
 * because it deals in a dozen projects at once and holds the roster of none of
 * them. Rather than draw controls that might 403, every row links back to the
 * project whose calendar owns it, where those powers are already correct.
 */
const AgendaRow = ({ meeting, t }: AgendaRowProps) => {
  const start = parseISO(meeting.startAt);
  const end = parseISO(meeting.endAt);
  const now = Date.now();
  const isLive = start.getTime() <= now && end.getTime() >= now;

  return (
    <li
      className={cn(
        'ui-card flex flex-col gap-2 rounded-2xl border border-edge bg-surface-raised p-3',
        'sm:flex-row sm:items-start sm:gap-3.5',
        isLive && 'border-brand/50 ring-1 ring-inset ring-brand/25',
      )}
    >
      {/* The clock, given its own column: an agenda is read down the times. */}
      <div className="flex shrink-0 items-center gap-2 sm:w-24 sm:flex-col sm:items-start sm:gap-0.5">
        <span className="text-sm font-semibold tabular-nums">{formatTime(start)}</span>
        <span className="text-[11px] tabular-nums text-content-faint">
          {t('meetings.until')} {formatTime(end)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="truncate text-sm font-semibold tracking-tight">{meeting.title}</h4>
          {isLive && (
            <Badge className="border-brand/50 bg-brand/12 text-brand">
              <Clock className="h-2.5 w-2.5" />
              {t('meetings.liveNow')}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-content-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-content-faint" />
            <span className="truncate">{meeting.room}</span>
          </span>

          {meeting.participants.length > 0 ? (
            <AvatarStack people={meeting.participants} max={5} />
          ) : (
            <span className="inline-flex items-center gap-1 text-content-faint">
              <Users className="h-3 w-3 shrink-0" />
              {t('meetings.wholeRoster')}
            </span>
          )}
        </div>

        {meeting.description && (
          <p className="line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-content-muted">
            {meeting.description}
          </p>
        )}
      </div>

      {/* Which project called it, carrying that project's own colour so a
          mixed week stays scannable by source as well as by time. */}
      {meeting.project && (
        <Link
          to={`/projects/${meeting.project.id}`}
          title={t('agenda.openProject', { name: meeting.project.name })}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-edge',
            'px-2.5 py-1 text-[11px] text-content-muted transition-colors',
            'hover:border-brand/50 hover:text-content',
          )}
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meeting.project.color }}
          />
          <span className="max-w-[9rem] truncate">{meeting.project.name}</span>
        </Link>
      )}
    </li>
  );
};

/**
 * Your week, across every project you are on.
 *
 * The project boards each answer "what is coming up *here*", which is the wrong
 * question for somebody who is on five of them — the only way to know whether
 * Tuesday afternoon was free was to open five tabs and read five calendars. So
 * this asks the question from the other side: one list, in clock order, of
 * everything you are expected at, with a filter for the times you genuinely
 * want one project's calendar and nothing else.
 *
 * Grouping is by day and the day headings are sticky, because an agenda is
 * scrolled rather than paged — unlike the project board, which pages by day
 * precisely because it has a month grid to page from.
 */
const MeetingsPage = () => {
  const t = useT();

  const [projectId, setProjectId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: meetings = [], isPending } = useMyAgenda(
    projectId === 'ALL' ? {} : { projectId },
  );
  // Only to populate the filter — the agenda itself is one request either way.
  const { data: projects = [] } = useProjects();

  /*
   * Searching is local, like the project board's.
   *
   * The response is already in hand and capped, so a round trip per keystroke
   * would buy nothing but latency. `useDeferredValue` keeps the input
   * responsive while a long list re-filters.
   */
  const query = useDeferredValue(search).trim().toLowerCase();

  const matches = useMemo(
    () =>
      query
        ? meetings.filter(
            (meeting) =>
              meeting.title.toLowerCase().includes(query) ||
              meeting.room.toLowerCase().includes(query) ||
              (meeting.project?.name.toLowerCase().includes(query) ?? false),
          )
        : meetings,
    [meetings, query],
  );

  const days = useMemo(() => {
    const byDay = new Map<string, Meeting[]>();

    for (const meeting of matches) {
      const key = dayKey(meeting.startAt);
      byDay.set(key, [...(byDay.get(key) ?? []), meeting]);
    }

    // The API already returns clock order, so the groups only need their keys
    // sorted — the rows inside each are in the right order by construction.
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  const projectOptions = useMemo(
    () => [
      { value: 'ALL', label: t('agenda.allProjects') },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
        swatch: project.color,
      })),
    ],
    [projects, t],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
            <RunicText mode="always">{t('agenda.meetingsEyebrow')}</RunicText>
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('agenda.meetingsTitle')}
          </h1>
          <p className="hidden text-sm text-content-muted sm:block">
            {t('agenda.meetingsBody')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('agenda.searchMeetings')}
              className="field h-9 w-40 pl-8 text-xs sm:w-48"
            />
          </div>

          <Select
            className="w-[10rem]"
            value={projectId}
            onChange={setProjectId}
            options={projectOptions}
          />
        </div>
      </header>

      {isPending && (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && days.length === 0 && (
        <EmptyState
          icon={<CalendarRange className="h-6 w-6" />}
          title={t(query ? 'agenda.noMeetingMatch' : 'agenda.noMeetings')}
          description={t(query ? 'agenda.noMeetingMatchBody' : 'agenda.noMeetingsBody')}
        />
      )}

      <div className="space-y-5">
        {days.map(([key, entries]) => {
          /*
           * Dimmed only if the whole day is behind us.
           *
           * `isPast(startOfDay(...))` would have dimmed *today* as well —
           * midnight this morning is, after all, in the past — which greys out
           * the one heading somebody opening this page is looking for. The
           * comparison has to be day against day, not instant against now, and
           * a meeting that started an hour ago is still today's.
           */
          const isEarlier = isBefore(
            startOfDay(parseISO(`${key}T12:00:00`)),
            startOfDay(new Date()),
          );

          return (
            <section key={key} className="space-y-1.5">
              <header
                className={cn(
                  'sticky top-0 z-10 flex items-center gap-2.5 bg-surface/95 px-1 py-1.5 backdrop-blur',
                  isEarlier && 'opacity-70',
                )}
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                  {formatDayLabel(`${key}T12:00:00`)}
                </h2>
                <span className="h-px flex-1 bg-edge/70" />
                <span className="text-[11px] tabular-nums text-content-faint">
                  {entries.length}
                </span>
              </header>

              <ul className="space-y-2">
                {entries.map((meeting) => (
                  <AgendaRow key={meeting.id} meeting={meeting} t={t} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default MeetingsPage;

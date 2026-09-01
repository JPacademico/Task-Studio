import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  ListOrdered,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

import {
  useCompleteMeeting,
  useDeleteMeeting,
  useOrganizationMeetings,
  useProjectMeetings,
} from '@/entities/meeting/model/queries';
import type { Meeting, MeetingProjectRef } from '@/entities/meeting/model/types';
import type { UserSummary } from '@/entities/user/model/types';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { CalendarSyncBadge } from '@/features/calendar-sync/ui/calendar-sync-badge';
import { clampText } from '@/shared/lib/text';
import { formatDayLabel, formatTime } from '@/shared/lib/dates';
import {
  AvatarStack,
  Badge,
  Button,
  DirectionArrow,
  EmptyState,
  FileAttachmentRow,
  Section,
  Segmented,
  Skeleton,
} from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';
import { MeetingComposer } from './meeting-composer';
import { RoomsManager } from './rooms-manager';

type MeetingView = 'upcoming' | 'day' | 'calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/** The bucket key a meeting falls into. Its start decides the day it lives on. */
const dayKey = (value: string | Date): string => format(new Date(value), 'yyyy-MM-dd');

interface MeetingRowProps {
  meeting: Meeting;
  canManage: boolean;
  /**
   * Draw the project this came from.
   *
   * Off on a project's own board, where it would be the same name on every row,
   * and on for a company's calendar, which mixes meetings from several projects
   * with meetings that belong to no project at all.
   */
  showSource: boolean;
  /** The row is one click from vanishing — see the two-step in the panel. */
  isConfirmingDelete: boolean;
  onEdit: (meeting: Meeting) => void;
  onComplete: (meetingId: string) => void;
  onDelete: (meetingId: string) => void;
  onRequestDelete: (meetingId: string | null) => void;
  t: Translate;
}

/**
 * One entry on the calendar.
 *
 * Memoised, and the whole panel is arranged so that the memo holds: every
 * handler below is a `useCallback` that takes an id, and the meetings
 * themselves only change identity when the row genuinely changes — the
 * realtime layer patches one element of the cached array rather than replacing
 * it (see `upsertMeeting`). Typing in the search box therefore re-renders the
 * input and nothing else.
 */
const MeetingRowBase = ({
  meeting,
  canManage,
  showSource,
  isConfirmingDelete,
  onEdit,
  onComplete,
  onDelete,
  onRequestDelete,
  t,
}: MeetingRowProps) => {
  const start = parseISO(meeting.startAt);
  const end = parseISO(meeting.endAt);
  const now = Date.now();
  const isLive = start.getTime() <= now && end.getTime() >= now;

  return (
    <li
      className={cn(
        'ui-card flex flex-col gap-2 rounded-2xl border border-edge bg-surface-raised p-3 sm:flex-row sm:items-start sm:gap-3.5',
        isLive && 'border-brand/50 ring-1 ring-inset ring-brand/25',
      )}
    >
      {/* The clock, given its own column: a calendar is read down the times. */}
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
            <span className="inline-flex items-center gap-1.5">
              <AvatarStack people={meeting.participants} max={5} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-content-faint">
              <Users className="h-3 w-3 shrink-0" />
              {t('meetings.wholeRoster')}
            </span>
          )}
        </div>

        {meeting.description && (
          <p className="line-clamp-3 whitespace-pre-line break-words text-xs leading-relaxed text-content-muted">
            {meeting.description}
          </p>
        )}

        {/* The paper everybody is asked to read beforehand. */}
        {meeting.file && <FileAttachmentRow file={meeting.file} />}

        {/* Where this one came from, carrying that project's own colour so a
            company's week stays scannable by source as well as by time. A
            meeting the company booked for itself names no project, and says so
            rather than leaving a gap the reader has to interpret. */}
        {showSource &&
          (meeting.project ? (
            <Link
              to={`/projects/${meeting.project.id}`}
              title={t('agenda.openProject', { name: meeting.project.name })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5',
                'text-[11px] text-content-muted transition-colors',
                'hover:border-brand/50 hover:text-content',
              )}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: meeting.project.color }}
              />
              <span className="max-w-[10rem] truncate">{meeting.project.name}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-edge px-2 py-0.5 text-[11px] text-content-faint">
              {t('meetings.companyWide')}
            </span>
          ))}
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-0.5 self-end sm:self-start">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('meetings.edit')}
            title={t('meetings.edit')}
            onClick={() => onEdit(meeting)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label={t('meetings.markComplete')}
            title={t('meetings.markCompleteHint')}
            onClick={() => onComplete(meeting.id)}
            className="hover:text-positive"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>

          {/* Two-step rather than a dialog, matching the text board: a meeting
              is not recoverable anywhere in this UI, and one stray click on a
              toolbar is exactly how it would go. */}
          <Button
            size={isConfirmingDelete ? 'sm' : 'icon'}
            variant={isConfirmingDelete ? 'danger' : 'ghost'}
            aria-label={t('meetings.delete')}
            title={t('meetings.delete')}
            onClick={() =>
              isConfirmingDelete ? onDelete(meeting.id) : onRequestDelete(meeting.id)
            }
            onBlur={() => onRequestDelete(null)}
            className={cn(!isConfirmingDelete && 'hover:text-danger')}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isConfirmingDelete && t('meetings.confirm')}
          </Button>
        </div>
      )}
    </li>
  );
};

const MeetingRow = memo(MeetingRowBase);
MeetingRow.displayName = 'MeetingRow';

interface MeetingsPanelProps {
  /**
   * Which calendar this panel is showing. Exactly one of the two.
   *
   * A company's is the *union* of what it booked and what every project filed
   * under it booked, assembled by the API — which is how a meeting posted on a
   * project turns up on its company's tab without anything having been copied
   * there. See the API's `MeetingsService`.
   */
  projectId?: string;
  organizationId?: string;
  /** Who may be named in the room: a project's roster, or a company's staff. */
  roster: UserSummary[];
  /** Projects a company meeting may additionally be posted to. */
  linkableProjects?: MeetingProjectRef[];
  /** Owner or admin: only they may post, edit, complete or delete. */
  canManage: boolean;
}

/**
 * The project's meetings.
 *
 * Three ways to read the same list, because "when is the next one" and "how
 * loaded is the 14th" are different questions and neither is answered well by
 * the other's layout:
 *
 *   - **Upcoming** is the whole schedule as a list, in day buckets.
 *   - **By day** is the same list one day at a time, with a pager — the
 *     per-day paging, and the only view where an empty day is a statement
 *     rather than a gap.
 *   - **Calendar** is a month at a glance, with the picked day underneath.
 *
 * ## Where the work happens
 *
 * All three read one cached snapshot of the project's live meetings, and the
 * search box and the day pager are *local filters over it*. That is deliberate
 * and it is the whole performance story of this tab: a request per arrow press
 * would be a round trip to answer a question the client can already answer, on
 * a surface people scrub back and forth through. The snapshot is capped by the
 * API, kept fresh for a minute, warmed by a prefetch while the user is still
 * on the board, and patched in place by the realtime layer — the same
 * arrangement the Post-it board and the text board already use.
 */
export const MeetingsPanel = ({
  projectId,
  organizationId,
  roster,
  linkableProjects,
  canManage,
}: MeetingsPanelProps) => {
  const t = useT();

  /*
   * Both hooks are always called, and one of them is always disabled.
   *
   * Hooks cannot be called conditionally, so the branch has to be in the
   * argument rather than around the call. The disabled one issues no request
   * and holds no cache entry, so the cost of the arrangement is a hook that
   * returns `undefined`.
   *
   * The project side reads the snapshot the project page already holds and
   * keeps live — see `useProjectMeetings`. The company side has no socket room
   * and refetches on open, which is the same trade the personal agenda makes.
   */
  const projectCalendar = useProjectMeetings(projectId);
  const organizationCalendar = useOrganizationMeetings(organizationId);
  const calendar = projectId ? projectCalendar : organizationCalendar;

  const meetings = calendar.data ?? [];
  const isPending = calendar.isPending;

  const deleteMeeting = useDeleteMeeting();
  const completeMeeting = useCompleteMeeting();

  const [view, setView] = useState<MeetingView>('upcoming');
  const [search, setSearch] = useState('');
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [cursor, setCursor] = useState(() => new Date());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);

  /*
   * The filter runs behind the keystroke rather than in front of it.
   *
   * `useDeferredValue` lets the input update at full priority and re-filters
   * the list in a lower-priority pass, which is exactly the shape of this
   * problem: the typing has to feel immediate and the results do not have to
   * land on the same frame. A debounce would achieve something similar by
   * making *everything* late, including the character being typed.
   */
  const query = useDeferredValue(search).trim().toLowerCase();

  const matches = useMemo(
    () =>
      query
        ? meetings.filter((meeting) => meeting.title.toLowerCase().includes(query))
        : meetings,
    [meetings, query],
  );

  // One pass, keyed by calendar day, instead of a filter per bucket or cell.
  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of matches) {
      const key = dayKey(meeting.startAt);
      map.set(key, [...(map.get(key) ?? []), meeting]);
    }
    return map;
  }, [matches]);

  const orderedDays = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), WEEK_OPTIONS),
        end: endOfWeek(endOfMonth(cursor), WEEK_OPTIONS),
      }),
    [cursor],
  );

  const openComposer = useCallback((meeting: Meeting | null) => {
    setEditing(meeting);
    setIsComposerOpen(true);
  }, []);

  const handleEdit = useCallback((meeting: Meeting) => openComposer(meeting), [openComposer]);

  const handleComplete = useCallback(
    (meetingId: string) => completeMeeting(meetingId),
    [completeMeeting],
  );

  const handleDelete = useCallback(
    (meetingId: string) => {
      setConfirmingId(null);
      deleteMeeting.mutate(meetingId);
    },
    [deleteMeeting.mutate],
  );

  const renderRows = (items: Meeting[]) =>
    items.map((meeting) => (
      <MeetingRow
        key={meeting.id}
        meeting={meeting}
        canManage={canManage}
        // A project's board would say the same name on every row.
        showSource={Boolean(organizationId)}
        isConfirmingDelete={confirmingId === meeting.id}
        onEdit={handleEdit}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onRequestDelete={setConfirmingId}
        t={t}
      />
    ));

  const dayMeetings = byDay.get(format(day, 'yyyy-MM-dd')) ?? [];

  /** The next day in either direction that actually has something on it. */
  const jumpToScheduled = (direction: 1 | -1) => {
    const current = format(day, 'yyyy-MM-dd');
    const candidates = direction === 1 ? orderedDays : [...orderedDays].reverse();
    const hit = candidates.find((key) => (direction === 1 ? key > current : key < current));
    if (hit) setDay(startOfDay(parseISO(hit)));
  };

  return (
    <div className="space-y-4">
      <div className="ui-textured flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2 sm:p-3">
        <label className="relative min-w-[10rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(clampText(event.target.value, TEXT_LIMITS.search))}
            placeholder={t('meetings.searchPlaceholder')}
            aria-label={t('meetings.search')}
            maxLength={TEXT_LIMITS.search}
            className="field h-9 py-0 pl-9 text-xs"
          />
        </label>

        <Segmented
          value={view}
          onChange={setView}
          options={[
            {
              value: 'upcoming' as const,
              label: t('meetings.viewUpcoming'),
              icon: <ListOrdered className="h-3 w-3" />,
            },
            {
              value: 'day' as const,
              label: t('meetings.viewByDay'),
              icon: <CalendarDays className="h-3 w-3" />,
            },
            {
              value: 'calendar' as const,
              label: t('meetings.viewCalendar'),
              icon: <CalendarRange className="h-3 w-3" />,
            },
          ]}
        />

        {/*
          Whether these meetings are reaching the reader's own calendar.

          Here rather than in a menu, because this is the surface on which the
          question occurs to somebody — looking at a meeting and wondering
          whether it will be on their phone tomorrow. The *controls* are in
          settings, one click away, because a calendar connection is a fact
          about the account rather than about this project. See the badge.

          `ml-auto` moves to the badge when there is no compose button, so the
          right-hand group is anchored either way.
        */}
        <div className={canManage ? 'ml-auto flex items-center gap-2' : 'ml-auto'}>
          <CalendarSyncBadge />

          {/*
            The room registry, one press from the calendar it feeds.

            Not in project settings, because a room is only ever thought about
            while booking one — the moment somebody notices the picker does not
            offer the room they are standing in. See `RoomsManager`.
          */}
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsRoomsOpen(true)}
              title={t('rooms.manageHint')}
            >
              <DoorOpen className="h-3.5 w-3.5" />
              {t('rooms.manage')}
            </Button>
          )}

          {canManage && (
            <Button size="sm" onClick={() => openComposer(null)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t('meetings.new')}
            </Button>
          )}
        </div>
      </div>

      {isPending && (
        <ul className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-24 rounded-2xl" />
            </li>
          ))}
        </ul>
      )}

      {!isPending && meetings.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={t('meetings.none')}
          description={t(canManage ? 'meetings.noneBodyAdmin' : 'meetings.noneBody')}
          action={
            canManage ? (
              <Button size="sm" variant="secondary" onClick={() => openComposer(null)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                {t('meetings.new')}
              </Button>
            ) : undefined
          }
        />
      )}

      {!isPending && meetings.length > 0 && matches.length === 0 && (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t('meetings.noMatch')}
          description={t('meetings.noMatchBody', { query: search.trim() })}
        />
      )}

      {/* --- Upcoming: the whole schedule, in day buckets ------------------- */}
      {!isPending && view === 'upcoming' && matches.length > 0 && (
        <div className="space-y-5">
          {orderedDays.map((key) => (
            <Section
              key={key}
              title={formatDayLabel(parseISO(key))}
              description={t('meetings.count', { count: byDay.get(key)?.length ?? 0 })}
            >
              <ul className="space-y-2">{renderRows(byDay.get(key) ?? [])}</ul>
            </Section>
          ))}
        </div>
      )}

      {/* --- By day: the per-day pager -------------------------------------- */}
      {!isPending && view === 'day' && (
        <div className="space-y-3">
          <header className="flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised px-3 py-2">
            <div className="ui-segment inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1">
              <button
                type="button"
                aria-label={t('meetings.previousDay')}
                onClick={() => setDay((current) => addDays(current, -1))}
                className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
              >
                <DirectionArrow direction="left" fallback={ChevronLeft} className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDay(startOfDay(new Date()))}
                className="rounded-lg px-2 py-1 text-xs font-medium text-content-muted transition-colors hover:text-content"
              >
                {t('meetings.today')}
              </button>
              <button
                type="button"
                aria-label={t('meetings.nextDay')}
                onClick={() => setDay((current) => addDays(current, 1))}
                className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
              >
                <DirectionArrow direction="right" fallback={ChevronRight} className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* A real date field, so paging a fortnight is one gesture rather
                than fourteen presses of the arrow. */}
            <input
              type="date"
              value={format(day, 'yyyy-MM-dd')}
              aria-label={t('meetings.pickDay')}
              onChange={(event) => {
                const picked = event.target.value;
                if (picked) setDay(startOfDay(parseISO(picked)));
              }}
              className="field h-9 w-auto py-0 text-xs"
            />

            <span className="text-xs font-semibold tracking-tight">
              {formatDayLabel(day)}
            </span>

            <span className="ml-auto text-[11px] text-content-faint">
              {t('meetings.count', { count: dayMeetings.length })}
            </span>
          </header>

          {dayMeetings.length > 0 ? (
            <ul className="space-y-2">{renderRows(dayMeetings)}</ul>
          ) : (
            <EmptyState
              className="px-4 py-10"
              icon={<CalendarDays className="h-5 w-5" />}
              title={t('meetings.nothingOnDay')}
              description={t('meetings.nothingOnDayBody')}
              action={
                orderedDays.length > 0 ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => jumpToScheduled(-1)}>
                      {t('meetings.jumpPrevious')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => jumpToScheduled(1)}>
                      {t('meetings.jumpNext')}
                    </Button>
                  </div>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {/* --- Calendar: a month at a glance ---------------------------------- */}
      {!isPending && view === 'calendar' && (
        <div className="space-y-3">
          <header className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">
              {format(cursor, 'MMMM yyyy')}
            </h3>

            <div className="ui-segment ml-auto inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1">
              <button
                type="button"
                aria-label={t('meetings.previousMonth')}
                onClick={() => setCursor((date) => subMonths(date, 1))}
                className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
              >
                <DirectionArrow direction="left" fallback={ChevronLeft} className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCursor(new Date());
                  setDay(startOfDay(new Date()));
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-content-muted transition-colors hover:text-content"
              >
                {t('meetings.today')}
              </button>
              <button
                type="button"
                aria-label={t('meetings.nextMonth')}
                onClick={() => setCursor((date) => addMonths(date, 1))}
                className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
              >
                <DirectionArrow direction="right" fallback={ChevronRight} className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div className="overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            <div className="grid grid-cols-7 border-b border-edge bg-surface-sunken/60">
              {WEEKDAYS.map((weekday) => (
                <span
                  key={weekday}
                  className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint"
                >
                  <span className="hidden sm:inline">{weekday}</span>
                  <span className="sm:hidden">{weekday[0]}</span>
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((cell) => {
                const items = byDay.get(format(cell, 'yyyy-MM-dd')) ?? [];
                const isOutside = !isSameMonth(cell, cursor);
                const isSelected = isSameDay(cell, day);

                return (
                  <button
                    key={cell.toISOString()}
                    type="button"
                    onClick={() => setDay(startOfDay(cell))}
                    className={cn(
                      'relative min-h-[76px] border-b border-r border-edge/60 p-1.5 text-left',
                      'transition-colors duration-150 last:border-r-0 hover:bg-surface-sunken/60',
                      isOutside && 'bg-surface-sunken/25 text-content-faint',
                      isSelected && 'bg-brand/[0.09] ring-1 ring-inset ring-brand/40',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular-nums',
                        isToday(cell)
                          ? 'bg-brand font-bold text-brand-contrast'
                          : 'font-medium text-content-muted',
                      )}
                    >
                      {format(cell, 'd')}
                    </span>

                    <ul className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((meeting) => (
                        <li
                          key={meeting.id}
                          title={`${formatTime(meeting.startAt)} · ${meeting.title}`}
                          className="flex items-center gap-1 truncate rounded bg-brand/[0.14] px-1 py-px text-[10px] leading-tight"
                        >
                          <span className="shrink-0 tabular-nums opacity-70">
                            {formatTime(meeting.startAt)}
                          </span>
                          <span className="truncate">{meeting.title}</span>
                        </li>
                      ))}

                      {items.length > 3 && (
                        <li className="px-1 text-[10px] font-medium text-content-faint">
                          +{items.length - 3}
                        </li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.section
            key={format(day, 'yyyy-MM-dd')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-3"
          >
            <header className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-brand" />
              <h4 className="text-sm font-semibold">{format(day, 'EEEE d MMMM')}</h4>
              <span className="ml-auto text-[11px] text-content-faint">
                {t('meetings.count', { count: dayMeetings.length })}
              </span>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openComposer(null)}
                  title={t('meetings.new')}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                </Button>
              )}
            </header>

            {dayMeetings.length === 0 ? (
              <p className="py-3 text-center text-xs text-content-faint">
                {t('meetings.nothingOnDay')}
              </p>
            ) : (
              <ul className="space-y-2">{renderRows(dayMeetings)}</ul>
            )}
          </motion.section>
        </div>
      )}

      {canManage && (
        <MeetingComposer
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setEditing(null);
          }}
          projectId={projectId}
          organizationId={organizationId}
          roster={roster}
          linkableProjects={linkableProjects}
          meeting={editing}
          // A new meeting posted from the calendar lands on the day being read,
          // not on today — which is almost never the day being looked at.
          defaultDay={view === 'upcoming' ? null : day}
        />
      )}

      {canManage && (
        <RoomsManager
          isOpen={isRoomsOpen}
          onClose={() => setIsRoomsOpen(false)}
          scope={{ projectId, organizationId }}
        />
      )}
    </div>
  );
};

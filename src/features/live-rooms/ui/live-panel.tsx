import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  FileText,
  ListChecks,
  Lock,
  MicOff,
  MonitorUp,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Users,
} from 'lucide-react';

import {
  useLiveRoomActions,
  useLiveRoomEvents,
  useLiveRooms,
} from '@/entities/live-room/model/queries';
import type { LiveRoom } from '@/entities/live-room/model/types';
import { useRoster } from '@/entities/project/model/queries';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { Avatar, AvatarStack, Button, EmptyState, Skeleton, Switch } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { LiveRoomComposer } from './live-room-composer';
import { LiveStage } from './live-stage';

interface LivePanelProps {
  projectId: string;
  /** Deep-linked from a notification: `?room=<id>`. */
  initialRoomId?: string | null;
  /** True when the reader may open rooms — a finished project may not. */
  canCreate: boolean;
  onOpenDocument?: (documentId: string) => void;
}

/** Running, about to run, or over — which is the only ordering this list needs. */
type RoomPhase = 'live' | 'scheduled' | 'ended';

const phaseOf = (room: LiveRoom): RoomPhase => {
  if (room.endedAt) return 'ended';
  return new Date(room.opensAt).getTime() <= Date.now() ? 'live' : 'scheduled';
};

/**
 * The Live tab.
 *
 * ## Why the list and the call share a surface rather than a route
 *
 * Joining a call is not navigation. A call has a `getUserMedia` permission, a
 * set of peer connections and a microphone attached to it, and a route change
 * — which unmounts the tree — would tear all of that down and rebuild it every
 * time somebody pressed back. So the stage replaces the list *in place*, and
 * leaving a call is a state change rather than a history entry.
 *
 * The deep link from a notification is the exception and is handled by opening
 * the room the id names, once, on arrival — see the effect below.
 */
export const LivePanel = ({
  projectId,
  initialRoomId,
  canCreate,
  onOpenDocument,
}: LivePanelProps) => {
  const t = useT();
  const currentUser = useCurrentUser();

  const [includeEnded, setIncludeEnded] = useState(false);
  const [composerRoom, setComposerRoom] = useState<LiveRoom | null>(null);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const { data: rooms = [], isLoading } = useLiveRooms(projectId, includeEnded);
  const { data: roster = [] } = useRoster(projectId);
  const { end, remove } = useLiveRoomActions(projectId);

  // Keeps the list honest while somebody else opens or closes a room.
  useLiveRoomEvents(projectId);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  /*
   * The deep link, honoured exactly once.
   *
   * A notification points at a specific room, and landing on the list with it
   * three rows down is not what was asked for. Guarded on `rooms.length` so it
   * runs after the first fetch rather than against an empty array, and it does
   * not re-fire when the list refreshes — `activeRoomId` having been set is
   * what stops that.
   */
  useEffect(() => {
    if (!initialRoomId || activeRoomId || rooms.length === 0) return;
    if (rooms.some((room) => room.id === initialRoomId)) setActiveRoomId(initialRoomId);
  }, [activeRoomId, initialRoomId, rooms]);

  /*
   * A room that ends while somebody is looking at its stage.
   *
   * The call hook notices the socket event and tears the call down, but the
   * panel still has the id selected — so without this the reader is left on a
   * stage for a call that no longer exists.
   */
  useEffect(() => {
    if (activeRoom?.endedAt) setActiveRoomId(null);
  }, [activeRoom?.endedAt]);

  /*
   * Stable, because the call hook keeps it in a dependency list.
   *
   * An inline arrow here is a new function on every render of this panel —
   * which happens whenever the room list refreshes — and that would tear down
   * and rebuild every socket listener in `useLiveCall` mid-call.
   */
  const leaveStage = useCallback(() => setActiveRoomId(null), []);

  if (activeRoom) {
    return (
      <LiveStage
        // Keyed on the room so that joining a different one builds a fresh
        // call rather than reusing the peer connections of the last.
        key={activeRoom.id}
        room={activeRoom}
        onLeave={leaveStage}
        onOpenDocument={onOpenDocument}
      />
    );
  }

  const openComposer = (room: LiveRoom | null) => {
    setComposerRoom(room);
    setComposerOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ui-section-title text-sm font-semibold tracking-tight">
            {t('live.heading')}
          </h2>
          <p className="text-xs text-content-muted">{t('live.subheading')}</p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={includeEnded}
            onChange={setIncludeEnded}
            label={t('live.showEnded')}
          />
          {canCreate && (
            <Button size="sm" onClick={() => openComposer(null)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t('live.new')}
            </Button>
          )}
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && rooms.length === 0 && (
        <EmptyState
          icon={<Radio className="h-6 w-6" />}
          title={t('live.emptyTitle')}
          description={t('live.emptyBody')}
          action={
            canCreate ? (
              <Button size="sm" onClick={() => openComposer(null)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                {t('live.new')}
              </Button>
            ) : undefined
          }
        />
      )}

      <ul className="space-y-2">
        {rooms.map((room) => {
          const phase = phaseOf(room);
          const isHost = room.createdBy.id === currentUser?.id;
          const canManage = isHost || room.you.isModerator;

          return (
            <li
              key={room.id}
              className={cn(
                'ui-card flex flex-col gap-3 rounded-2xl border bg-surface-raised p-4',
                phase === 'live' ? 'border-positive/60' : 'border-edge',
                phase === 'ended' && 'opacity-70',
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The one badge that is a state rather than a setting,
                        so it leads and it is the only coloured one. */}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-wide',
                        phase === 'live' && 'bg-positive/15 text-positive',
                        phase === 'scheduled' && 'bg-brand/12 text-brand',
                        phase === 'ended' && 'bg-surface-sunken text-content-faint',
                      )}
                    >
                      {phase === 'live' && <Radio className="h-2.5 w-2.5" />}
                      {t(
                        phase === 'live'
                          ? 'live.stateLive'
                          : phase === 'scheduled'
                            ? 'live.stateScheduled'
                            : 'live.stateEnded',
                      )}
                    </span>

                    <h3 className="ui-task-title min-w-0 truncate text-sm font-semibold">
                      {room.title}
                    </h3>
                  </div>

                  {room.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-content-muted">
                      {room.description}
                    </p>
                  )}

                  {/* --- What kind of room this is ------------------------- */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-3xs text-content-faint">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {phase === 'scheduled'
                        ? t('live.opensIn', { when: formatRelative(room.opensAt) })
                        : phase === 'live'
                          ? t('live.openedAt', { when: formatDateTime(room.opensAt) })
                          : t('live.endedAt', { when: formatDateTime(room.endedAt as string) })}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      {room.audience === 'SELECTED' ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Users className="h-3 w-3" />
                      )}
                      {t(
                        room.audience === 'SELECTED'
                          ? 'live.audienceSelected'
                          : 'live.audienceEveryone',
                      )}
                    </span>

                    {room.talkPolicy === 'LIMITED' && (
                      <span className="inline-flex items-center gap-1">
                        <MicOff className="h-3 w-3" />
                        {t('live.talkLimited')}
                      </span>
                    )}

                    {room.screenPolicy === 'LIMITED' && (
                      <span className="inline-flex items-center gap-1">
                        <MonitorUp className="h-3 w-3" />
                        {t('live.screenLimited')}
                      </span>
                    )}

                    {room.tasks.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        {t('live.aboutTasks', { count: String(room.tasks.length) })}
                      </span>
                    )}

                    {room.document && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span className="max-w-[10rem] truncate">{room.document.title}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* --- Who is expected ---------------------------------- */}
                <div className="flex shrink-0 items-center gap-2">
                  <Avatar
                    name={room.createdBy.displayName}
                    src={room.createdBy.avatarUrl}
                    size="sm"
                    title={t('live.hostedBy', { name: room.createdBy.displayName })}
                  />
                  {room.members.length > 1 && (
                    <AvatarStack
                      people={room.members.map((member) => member.user)}
                      max={4}
                      size="sm"
                    />
                  )}
                </div>
              </div>

              {/* --- What you can do about it -------------------------- */}
              <div className="flex flex-wrap items-center gap-2">
                {phase !== 'ended' && (
                  <Button
                    size="sm"
                    onClick={() => setActiveRoomId(room.id)}
                    // A scheduled room is joinable by its host early — somebody
                    // has to be able to test a microphone — and the API is what
                    // enforces that, so the button is offered and the refusal
                    // is explained if it comes.
                    variant={phase === 'live' ? 'primary' : 'secondary'}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    {t(phase === 'live' ? 'live.join' : 'live.joinEarly')}
                  </Button>
                )}

                {canManage && phase !== 'ended' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => openComposer(room)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => end.mutate(room.id)}>
                      {t('live.end')}
                    </Button>
                  </>
                )}

                {canManage && phase === 'ended' && (
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(room.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <LiveRoomComposer
        isOpen={isComposerOpen}
        onClose={() => setComposerOpen(false)}
        projectId={projectId}
        roster={roster}
        room={composerRoom}
      />
    </div>
  );
};

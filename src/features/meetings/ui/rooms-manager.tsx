import { useState } from 'react';
import { DoorOpen, Plus, Trash2, Users } from 'lucide-react';

import {
  useCreateMeetingRoom,
  useDeleteMeetingRoom,
  useMeetingRooms,
} from '@/entities/meeting/model/queries';
import type { MeetingRoom, RoomScope } from '@/entities/meeting/model/types';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { Button, EmptyState, Input, Modal, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface RoomsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which calendar's rooms these are. Exactly one of the two. */
  scope: RoomScope;
}

/** The largest room this app is willing to believe in. Matches the API. */
const MAX_CAPACITY = 10_000;

/**
 * One registered room, and the two things an admin does to it.
 *
 * Inherited rooms are drawn and are not editable, which is the visible half of
 * the loan: a project can *book* the building's boardroom and cannot rename it,
 * because renaming it would rename it for every other project too. Saying so on
 * the row is what stops that reading as a bug.
 */
const RoomRow = ({
  room,
  onDelete,
  isConfirming,
  onRequestDelete,
}: {
  room: MeetingRoom;
  onDelete: (roomId: string) => void;
  isConfirming: boolean;
  onRequestDelete: (roomId: string | null) => void;
}) => {
  const t = useT();

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border border-edge bg-surface-raised p-2.5',
        room.isInherited && 'border-dashed',
      )}
    >
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-content-muted"
      >
        <DoorOpen className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{room.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-2xs text-content-faint">
          {room.location && <span className="truncate">{room.location}</span>}
          {room.capacity !== null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {room.capacity}
            </span>
          )}
          {room.isInherited && <span>{t('rooms.inherited')}</span>}
        </p>
      </div>

      {/* Two-step, matching the meeting row above it: nothing here is
          recoverable from the interface, and one stray click is how it goes. */}
      {!room.isInherited && (
        <Button
          size={isConfirming ? 'sm' : 'icon'}
          variant={isConfirming ? 'danger' : 'ghost'}
          aria-label={t('rooms.remove')}
          title={t('rooms.removeHint')}
          onClick={() => (isConfirming ? onDelete(room.id) : onRequestDelete(room.id))}
          onBlur={() => onRequestDelete(null)}
          className={cn(!isConfirming && 'hover:text-danger')}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isConfirming && t('meetings.confirm')}
        </Button>
      )}
    </li>
  );
};

/**
 * The room registry, as a dialog off the meetings tab.
 *
 * ## Why rooms are managed here and not in project settings
 *
 * Because a room is only ever thought about while booking one. Somebody
 * discovers they need to register "Sala 2" at the moment the composer does not
 * offer it — and a registry two clicks into a settings dialog on another tab is
 * one they will not find then, and will not remember exists later. It opens
 * from the toolbar directly above the calendar it feeds.
 *
 * ## Why this does not edit a room in place
 *
 * Renaming exists on the API and is deliberately not offered here yet. The
 * reason is what a rename *means*: `Meeting.room` keeps the name a meeting was
 * booked under, so renaming a room leaves every existing booking saying the old
 * name — correct, and confusing to explain in a row of a dialog. Registering
 * the new name and retiring the old one is the same outcome with nothing to
 * explain. Retiring is the API's `isArchived`; this dialog offers removal,
 * which the API makes safe by keeping the bookings.
 */
export const RoomsManager = ({ isOpen, onClose, scope }: RoomsManagerProps) => {
  const t = useT();

  const { data: rooms = [], isPending } = useMeetingRooms(scope, isOpen);
  const createRoom = useCreateMeetingRoom(scope);
  const deleteRoom = useDeleteMeetingRoom(scope);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const parsedCapacity = Number.parseInt(capacity, 10);
  const capacityIsValid =
    capacity.trim().length === 0 ||
    (Number.isFinite(parsedCapacity) && parsedCapacity > 0 && parsedCapacity <= MAX_CAPACITY);

  const canSubmit = name.trim().length > 0 && capacityIsValid && !createRoom.isPending;

  const submit = () => {
    if (!canSubmit) return;

    createRoom.mutate(
      {
        name: name.trim(),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(capacity.trim() ? { capacity: parsedCapacity } : {}),
      },
      {
        onSuccess: () => {
          setName('');
          setLocation('');
          setCapacity('');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('rooms.title')} className="sm:max-w-lg">
      <div className="space-y-4">
        <form
          className="space-y-3 rounded-2xl border border-edge bg-surface-sunken/40 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            label={t('rooms.nameLabel')}
            name="roomName"
            value={name}
            onChange={(event) =>
              setName(clampText(event.target.value, TEXT_LIMITS.meetingLocation))
            }
            placeholder={t('rooms.namePlaceholder')}
            maxLength={TEXT_LIMITS.meetingLocation}
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <Input
              label={t('rooms.locationLabel')}
              name="roomLocation"
              value={location}
              onChange={(event) => setLocation(clampText(event.target.value, 200))}
              placeholder={t('rooms.locationPlaceholder')}
              maxLength={200}
            />
            <Input
              label={t('rooms.capacityLabel')}
              name="roomCapacity"
              type="number"
              min={1}
              max={MAX_CAPACITY}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value.slice(0, 5))}
              error={capacityIsValid ? undefined : t('rooms.capacityInvalid')}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={createRoom.isPending} disabled={!canSubmit}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t('rooms.add')}
            </Button>
          </div>
        </form>

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={<DoorOpen className="h-6 w-6" />}
            title={t('rooms.none')}
            description={t('rooms.noneBody')}
          />
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                isConfirming={confirmingId === room.id}
                onRequestDelete={setConfirmingId}
                onDelete={(roomId) => {
                  setConfirmingId(null);
                  deleteRoom.mutate(roomId);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

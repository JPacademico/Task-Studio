import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

import { useCreateMeeting, useUpdateMeeting } from '@/entities/meeting/model/queries';
import type { Meeting } from '@/entities/meeting/model/types';
import type { RosterMember } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import {
  DATE_INPUT_MAX,
  DATE_INPUT_MIN,
  fromDateTimeInput,
  isDateTimeInput,
  toDateTimeInput,
} from '@/shared/lib/dates';
import { Avatar, Button, Input, Modal, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface MeetingComposerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  roster: RosterMember[];
  /** Present when editing; absent when posting a new one. */
  meeting?: Meeting | null;
  /** Prefilled start, so "new" from a calendar cell lands on that day. */
  defaultDay?: Date | null;
}

/** An hour, which is what a meeting is until somebody says otherwise. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** The next round hour — nobody schedules anything for 14:37. */
const nextHour = (day: Date): Date => {
  const start = new Date(day);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return start;
};

/**
 * Post or edit a meeting.
 *
 * Only an owner or an admin ever sees this — the panel gates the buttons that
 * open it, and the API refuses the write regardless, because a meeting is an
 * assertion about other people's time rather than a note anybody can leave.
 *
 * The participant list is optional and means what it says: who is expected in
 * the room. Leaving it empty is not an omission, it is the common case — a
 * meeting nobody was singled out for is one the whole roster is invited to,
 * and the panel says so in those words rather than listing everybody back.
 */
export const MeetingComposer = ({
  isOpen,
  onClose,
  projectId,
  roster,
  meeting,
  defaultDay,
}: MeetingComposerProps) => {
  const t = useT();
  const createMeeting = useCreateMeeting(projectId);
  const updateMeeting = useUpdateMeeting();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  // Reset (or hydrate) whenever the dialog opens.
  useEffect(() => {
    if (!isOpen) return;

    const start = meeting ? new Date(meeting.startAt) : nextHour(defaultDay ?? new Date());
    const end = meeting
      ? new Date(meeting.endAt)
      : new Date(start.getTime() + DEFAULT_DURATION_MS);

    setTitle(meeting?.title ?? '');
    setRoom(meeting?.room ?? '');
    setDescription(meeting?.description ?? '');
    setStartAt(toDateTimeInput(start));
    setEndAt(toDateTimeInput(end));
    setParticipantIds(meeting?.participants.map((person) => person.id) ?? []);
  }, [defaultDay, isOpen, meeting]);

  /*
   * Moving the start drags the end along, keeping the length.
   *
   * Without this, changing the day of a meeting means editing two fields and
   * getting the second one wrong is a validation error rather than a
   * correction. Only while the window is currently valid, so a half-typed date
   * cannot throw the other end somewhere absurd.
   */
  const handleStartChange = (value: string) => {
    const previousStart = new Date(startAt).getTime();
    const previousEnd = new Date(endAt).getTime();
    setStartAt(value);

    const nextStart = new Date(value).getTime();
    if (!Number.isFinite(nextStart)) return;
    if (!Number.isFinite(previousStart) || !Number.isFinite(previousEnd)) return;
    if (previousEnd <= previousStart) return;

    setEndAt(toDateTimeInput(new Date(nextStart + (previousEnd - previousStart))));
  };

  // Same guard as the task composer: an unparseable year is its own failure,
  // and it has to be excluded before the two ends can be compared at all.
  // See `shared/lib/dates`.
  const startIsMalformed = !isDateTimeInput(startAt);
  const endIsMalformed = !isDateTimeInput(endAt);

  const windowIsInvalid =
    !startIsMalformed &&
    !endIsMalformed &&
    Boolean(startAt && endAt) &&
    new Date(endAt).getTime() <= new Date(startAt).getTime();

  const canSubmit =
    title.trim().length >= 2 && room.trim().length >= 1 && Boolean(startAt) &&
    Boolean(endAt) && !windowIsInvalid && !startIsMalformed && !endIsMalformed;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload = {
      title: title.trim(),
      room: room.trim(),
      description: description.trim() || undefined,
      // `canSubmit` has already proved both parse; the cast documents that.
      startAt: fromDateTimeInput(startAt) as string,
      endAt: fromDateTimeInput(endAt) as string,
      participantIds,
    };

    if (meeting) {
      await updateMeeting.mutateAsync({ meetingId: meeting.id, payload });
    } else {
      await createMeeting.mutateAsync(payload);
    }

    onClose();
  };

  const isPending = createMeeting.isPending || updateMeeting.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(meeting ? 'meetings.editTitle' : 'meetings.newTitle')}
      description={t('meetings.composerSubtitle')}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} isLoading={isPending} disabled={!canSubmit}>
            {t(meeting ? 'meetings.saveChanges' : 'meetings.post')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Input
          label={t('meetings.nameLabel')}
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('meetings.namePlaceholder')}
          maxLength={140}
          autoFocus
        />

        <Input
          label={t('meetings.roomLabel')}
          name="room"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          placeholder={t('meetings.roomPlaceholder')}
          maxLength={120}
          hint={t('meetings.roomHint')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('meetings.starts')}
            name="startAt"
            type="datetime-local"
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            value={startAt}
            onChange={(event) => handleStartChange(event.target.value)}
            error={startIsMalformed ? t('task.dateInvalid') : undefined}
          />
          <Input
            label={t('meetings.ends')}
            name="endAt"
            type="datetime-local"
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            error={
              endIsMalformed
                ? t('task.dateInvalid')
                : windowIsInvalid
                  ? t('meetings.windowInvalid')
                  : undefined
            }
          />
        </div>

        <Textarea
          label={t('meetings.descriptionLabel')}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('meetings.descriptionPlaceholder')}
          maxLength={4000}
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-content-muted">
            {t('meetings.participants')}{' '}
            <span className="text-content-faint">
              ({participantIds.length}/{roster.length})
            </span>
          </p>
          <p className="text-[11px] text-content-faint">{t('meetings.participantsHint')}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            {roster.map((member) => {
              const isSelected = participantIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setParticipantIds((current) =>
                      isSelected
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border py-1 pl-2 pr-2.5 text-xs transition-all duration-150',
                    isSelected
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-edge text-content-muted hover:border-content-faint',
                  )}
                >
                  <Avatar name={member.displayName} src={member.avatarUrl} size="xs" />
                  <span className="max-w-[8rem] truncate">{member.displayName}</span>
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
};

import { useEffect, useState } from 'react';

import {
  useCreateMeeting,
  useMeetingRooms,
  useUpdateMeeting,
} from '@/entities/meeting/model/queries';
import type { Meeting, MeetingProjectRef } from '@/entities/meeting/model/types';
import type { AttachedFileDraft, UserSummary } from '@/entities/user/model/types';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import {
  DATE_WINDOW_YEARS,
  dateInputBounds,
  fromDateTimeInput,
  isDateTimeInput,
  isWithinDateWindow,
  toDateTimeInput,
} from '@/shared/lib/dates';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import {
  Button,
  FileAttachmentField,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface MeetingComposerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Which calendar this is being posted to. Exactly one, and it is fixed for the life of the
   * surface that opened the composer — a project board can only book against itself.
   */
  projectId?: string;
  organizationId?: string;
  /**
   * Who may be named in the room: a project's roster, or a company's staff. Typed as the summary
   * both of those already are, rather than as `RosterMember`, because the composer needs a name.
   */
  roster: UserSummary[];
  /**
   * Projects this meeting may be attached to, offered only in company mode. The whole of feature
   * 5's "link the meeting to a project".
   */
  linkableProjects?: MeetingProjectRef[];
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
 * Post or edit a meeting. Only an owner or an admin ever sees this — the panel gates the buttons
 * that open it, and the API refuses the write regardless.
 */
export const MeetingComposer = ({
  isOpen,
  onClose,
  projectId,
  organizationId,
  roster,
  linkableProjects,
  meeting,
  defaultDay,
}: MeetingComposerProps) => {
  const t = useT();
  const createMeeting = useCreateMeeting({ projectId, organizationId });
  const updateMeeting = useUpdateMeeting();

  // The rooms this calendar can book, fetched only while the dialog is open. A project's answer
  // includes every room its company holds — the inheritance is the server's join.
  const { data: rooms = [] } = useMeetingRooms({ projectId, organizationId }, isOpen);

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  /**
   * The registered room, or `''` for "somewhere else". `''` rather than `undefined` because it is
   * bound to a `Select`, and a controlled select with an undefined value is an uncontrolled one.
   */
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  /**
   * The project a company meeting is about, or `''` for none. Only ever set in company mode. `''`
   * rather than `undefined` because it is bound to a `Select`.
   */
  const [linkedProjectId, setLinkedProjectId] = useState('');
  /**
   * The paper the meeting is about. Three states, matching the task composer's: an empty `key`
   * means the file came from the row rather than from this session, so the PATCH leaves it alone.
   */
  const [file, setFile] = useState<AttachedFileDraft | null>(null);

  const canLinkProject = Boolean(
    organizationId && !meeting && (linkableProjects?.length ?? 0) > 0,
  );

  // Reset (or hydrate) whenever the dialog opens.
  useEffect(() => {
    if (!isOpen) return;

    const start = meeting ? new Date(meeting.startAt) : nextHour(defaultDay ?? new Date());
    const end = meeting
      ? new Date(meeting.endAt)
      : new Date(start.getTime() + DEFAULT_DURATION_MS);

    setTitle(meeting?.title ?? '');
    setRoom(meeting?.room ?? '');
    setRoomId(meeting?.roomId ?? '');
    setDescription(meeting?.description ?? '');
    setStartAt(toDateTimeInput(start));
    setEndAt(toDateTimeInput(end));
    setParticipantIds(meeting?.participants.map((person) => person.id) ?? []);
    setLinkedProjectId(meeting?.projectId ?? '');
    // Always empty, including when editing. Teams are expanded into people the moment they are
    // picked, so an existing meeting has a guest *list*.
    setTeamIds([]);
    setFile(
      meeting?.file
        ? { key: '', name: meeting.file.name, size: meeting.file.size, url: meeting.file.url }
        : null,
    );
  }, [defaultDay, isOpen, meeting]);

  // Moving the start drags the end along, keeping the length.
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

  // Same guard as the task composer: an unparseable year is its own failure, and it has to be
  // excluded before the two ends can be compared at all.
  const startIsMalformed = !isDateTimeInput(startAt);
  const endIsMalformed = !isDateTimeInput(endAt);

  // Same five-year window as a task's — a meeting booked for 2100 is a typo,
  // not a plan. See `isWithinDateWindow`.
  const startIsTooFar = !startIsMalformed && !isWithinDateWindow(startAt);
  const endIsTooFar = !endIsMalformed && !isWithinDateWindow(endAt);

  const bounds = dateInputBounds(
    toDateTimeInput(meeting?.startAt ?? null),
    toDateTimeInput(meeting?.endAt ?? null),
  );

  const windowIsInvalid =
    !startIsMalformed &&
    !endIsMalformed &&
    Boolean(startAt && endAt) &&
    new Date(endAt).getTime() <= new Date(startAt).getTime();

  // A room is named one way or the other, and one of them is enough.
  const hasRooms = rooms.length > 0;
  const isCustomRoom = !roomId;
  const roomIsNamed = Boolean(roomId) || room.trim().length >= 1;

  const canSubmit =
    title.trim().length >= 2 &&
    roomIsNamed &&
    Boolean(startAt) &&
    Boolean(endAt) &&
    !windowIsInvalid &&
    !startIsMalformed &&
    !endIsMalformed &&
    !startIsTooFar &&
    !endIsTooFar;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload = {
      title: title.trim(),
      // One or the other, never both. The API takes the name from the registry when an id is sent —
      // a room cannot be booked under a label that is not what it is called.
      ...(roomId ? { roomId } : { room: room.trim() }),
      description: description.trim() || undefined,
      // `canSubmit` has already proved both parse; the cast documents that.
      startAt: fromDateTimeInput(startAt) as string,
      endAt: fromDateTimeInput(endAt) as string,
      participantIds,
      // Merged with the names above by the API; empty is simply omitted.
      ...(teamIds.length > 0 ? { teamIds } : {}),
    };

    // The document: a fresh key attaches or replaces, `null` detaches, and an
    // untouched one is omitted so the API keeps what is already there.
    const filePatch =
      file?.key
        ? { file: { key: file.key, name: file.name, size: file.size } }
        : file === null && meeting?.file
          ? { file: null }
          : {};

    if (meeting) {
      // The link is not editable. Moving a meeting off one project's board and onto another is not
      // a change to the meeting.
      await updateMeeting.mutateAsync({
        meetingId: meeting.id,
        payload: {
          ...payload,
          ...filePatch,
          // Explicitly null when the room was typed, which is the only way to *give a registered
          // room back*.
          roomId: roomId || null,
        },
      });
    } else {
      await createMeeting.mutateAsync({
        ...payload,
        ...(file?.key ? { file: { key: file.key, name: file.name, size: file.size } } : {}),
        ...(canLinkProject && linkedProjectId ? { projectId: linkedProjectId } : {}),
      });
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
          onChange={(event) => setTitle(clampText(event.target.value, TEXT_LIMITS.meetingTitle))}
          placeholder={t('meetings.namePlaceholder')}
          maxLength={TEXT_LIMITS.meetingTitle}
          autoFocus
        />

        {/* The room: picked from the registry, or typed. Both, rather than one replacing the
            other, because both are real. */}
        {hasRooms ? (
          <div className="space-y-2">
            <Select
              size="md"
              className="w-full"
              label={t('meetings.roomLabel')}
              value={roomId}
              onChange={setRoomId}
              options={[
                ...rooms.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                  hint:
                    [entry.location, entry.capacity ? `${entry.capacity}` : null]
                      .filter(Boolean)
                      .join(' · ') || undefined,
                })),
                { value: '', label: t('meetings.roomElsewhere') },
              ]}
            />

            {isCustomRoom && (
              <Input
                name="room"
                value={room}
                onChange={(event) =>
                  setRoom(clampText(event.target.value, TEXT_LIMITS.meetingLocation))
                }
                placeholder={t('meetings.roomPlaceholder')}
                maxLength={TEXT_LIMITS.meetingLocation}
              />
            )}
          </div>
        ) : (
          <Input
            label={t('meetings.roomLabel')}
            name="room"
            value={room}
            onChange={(event) =>
              setRoom(clampText(event.target.value, TEXT_LIMITS.meetingLocation))
            }
            placeholder={t('meetings.roomPlaceholder')}
            maxLength={TEXT_LIMITS.meetingLocation}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('meetings.starts')}
            name="startAt"
            type="datetime-local"
            min={bounds.min}
            max={bounds.max}
            value={startAt}
            onChange={(event) => handleStartChange(event.target.value)}
            error={
              startIsMalformed
                ? t('task.dateInvalid')
                : startIsTooFar
                  ? t('task.dateOutOfRange', { years: String(DATE_WINDOW_YEARS) })
                  : undefined
            }
          />
          <Input
            label={t('meetings.ends')}
            name="endAt"
            type="datetime-local"
            min={bounds.min}
            max={bounds.max}
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            error={
              endIsMalformed
                ? t('task.dateInvalid')
                : endIsTooFar
                  ? t('task.dateOutOfRange', { years: String(DATE_WINDOW_YEARS) })
                  : windowIsInvalid
                    ? t('meetings.windowInvalid')
                    : undefined
            }
          />
        </div>

        {canLinkProject && (
          <div className="space-y-1.5">
            <Select
              size="md"
              className="w-full"
              label={t('meetings.linkProject')}
              value={linkedProjectId}
              onChange={setLinkedProjectId}
              options={[
                { value: '', label: t('meetings.linkProjectNone') },
                ...(linkableProjects ?? []).map((project) => ({
                  value: project.id,
                  label: project.name,
                  swatch: project.color,
                })),
              ]}
            />
            <p className="text-2xs leading-relaxed text-content-faint">
              {t('meetings.linkProjectHint')}
            </p>
          </div>
        )}

        <Textarea
          label={t('meetings.descriptionLabel')}
          name="description"
          value={description}
          onChange={(event) =>
            setDescription(clampText(event.target.value, TEXT_LIMITS.meetingAgenda))
          }
          placeholder={t('meetings.descriptionPlaceholder')}
          maxLength={TEXT_LIMITS.meetingAgenda}
        />

        {/* Who is expected in the room — named one at a time, or by team. The scope of the
            teams tab follows the meeting: a company meeting reaches for the company's teams. */}
        <InvitePicker
          people={roster}
          selectedPeople={participantIds}
          onTogglePerson={(userId) =>
            setParticipantIds((current) =>
              current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId],
            )
          }
          teamScope={
            organizationId ? { organizationId } : projectId ? { projectId } : null
          }
          selectedTeams={teamIds}
          onToggleTeam={(teamId) =>
            setTeamIds((current) =>
              current.includes(teamId)
                ? current.filter((id) => id !== teamId)
                : [...current, teamId],
            )
          }
          isOpen={isOpen}
          label={t('meetings.participants')}
        />

        {/* The paper the meeting is about: an agenda, a deck, a contract. Minutes written
            afterwards still belong on the text board. */}
        <FileAttachmentField
          label={t('meetings.documentAttachment')}
          value={file}
          onChange={setFile}
        />
      </form>
    </Modal>
  );
};

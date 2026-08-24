import { useEffect, useState } from 'react';

import { useCreateMeeting, useUpdateMeeting } from '@/entities/meeting/model/queries';
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
   * Which calendar this is being posted to. Exactly one, and it is fixed for
   * the life of the surface that opened the composer — a project board can only
   * book against itself, and a company only against itself.
   */
  projectId?: string;
  organizationId?: string;
  /**
   * Who may be named in the room: a project's roster, or a company's staff.
   *
   * Typed as the summary both of those already are, rather than as
   * `RosterMember`, because the composer needs a name, a face and an id and has
   * no business knowing what role anybody holds in either place.
   */
  roster: UserSummary[];
  /**
   * Projects this meeting may be attached to, offered only in company mode.
   *
   * The whole of feature 5's "link the meeting to a project": picking one puts
   * the meeting on that project's board as well as on the company's calendar,
   * because a company meeting *about* a project is something both audiences
   * need in front of them. Absent — or empty — and the field is not drawn at
   * all, which is the right answer both for a project board (it is already
   * attached to itself) and for a company that has filed nothing yet.
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
  organizationId,
  roster,
  linkableProjects,
  meeting,
  defaultDay,
}: MeetingComposerProps) => {
  const t = useT();
  const createMeeting = useCreateMeeting({ projectId, organizationId });
  const updateMeeting = useUpdateMeeting();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  /**
   * The project a company meeting is about, or `''` for none.
   *
   * Only ever set in company mode. `''` rather than `undefined` because it is
   * bound to a `Select`, and a controlled select with an undefined value is an
   * uncontrolled one.
   */
  const [linkedProjectId, setLinkedProjectId] = useState('');
  /**
   * The paper the meeting is about.
   *
   * Three states, matching the task composer's: an empty `key` means the file
   * came from the row rather than from this session, so the PATCH leaves it
   * alone; a real key is a fresh upload; `null` is somebody taking it off.
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
    setDescription(meeting?.description ?? '');
    setStartAt(toDateTimeInput(start));
    setEndAt(toDateTimeInput(end));
    setParticipantIds(meeting?.participants.map((person) => person.id) ?? []);
    setLinkedProjectId(meeting?.projectId ?? '');
    /*
     * Always empty, including when editing.
     *
     * Teams are expanded into people the moment they are picked, so an existing
     * meeting has a guest *list*, not a memory of which teams produced it —
     * see the API's `TeamsService`. Pre-selecting anything here would be
     * inventing a fact the row does not carry.
     */
    setTeamIds([]);
    setFile(
      meeting?.file
        ? { key: '', name: meeting.file.name, size: meeting.file.size, url: meeting.file.url }
        : null,
    );
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

  const canSubmit =
    title.trim().length >= 2 &&
    room.trim().length >= 1 &&
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
      room: room.trim(),
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
      /*
       * The link is not editable.
       *
       * Moving a meeting off one project's board and onto another is not a
       * change to the meeting — it is a change to whose calendar it was ever
       * on, and to who was told about it. The API refuses it for that reason,
       * and the composer does not offer it: delete and repost is both clearer
       * and the only thing that actually notifies the new audience.
       */
      await updateMeeting.mutateAsync({
        meetingId: meeting.id,
        payload: { ...payload, ...filePatch },
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

        <Input
          label={t('meetings.roomLabel')}
          name="room"
          value={room}
          onChange={(event) => setRoom(clampText(event.target.value, TEXT_LIMITS.meetingLocation))}
          placeholder={t('meetings.roomPlaceholder')}
          maxLength={TEXT_LIMITS.meetingLocation}
        />

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
            <p className="text-[11px] leading-relaxed text-content-faint">
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

        {/*
          Who is expected in the room — named one at a time, or by team.

          The scope of the teams tab follows the meeting: a company meeting
          reaches for the company's teams, a project meeting for that project's.
          Individuals is the default, and the tab disappears where there are no
          teams to offer.
        */}
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

        {/*
          The paper the meeting is about: an agenda, a deck, a contract.

          Minutes written afterwards still belong on the text board, where the
          people who were in the room can edit them. This is the thing everybody
          is asked to read beforehand.
        */}
        <FileAttachmentField
          label={t('meetings.documentAttachment')}
          value={file}
          onChange={setFile}
        />
      </form>
    </Modal>
  );
};

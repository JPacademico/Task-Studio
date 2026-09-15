import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, ListChecks, Mic, MonitorUp, Users } from 'lucide-react';

import { useLiveRoomActions } from '@/entities/live-room/model/queries';
import type {
  LiveAudience,
  LivePolicy,
  LiveRoom,
  UpdateLiveRoomPayload,
} from '@/entities/live-room/model/types';
import { useProjectDocuments } from '@/entities/document/model/queries';
import { useTasks } from '@/entities/task/model/queries';
import type { RosterMember } from '@/entities/project/model/types';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { cn } from '@/shared/lib/cn';
import {
  dateInputBounds,
  fromDateTimeInput,
  isDateTimeInput,
  isWithinDateWindow,
  toDateTimeInput,
} from '@/shared/lib/dates';
import { Avatar, Button, Input, Modal, Select, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface LiveRoomComposerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  roster: RosterMember[];
  /** Present when editing an existing room; absent when opening a new one. */
  room?: LiveRoom | null;
}

/**
 * The next round quarter-hour, for a room somebody is scheduling rather than
 * opening. Nobody arranges a call for 14:37.
 */
const nextQuarter = (): Date => {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil((start.getMinutes() + 1) / 15) * 15);
  return start;
};

/**
 * Open a live room, or change one.
 *
 * ## Why "now" is a mode rather than a prefilled time
 *
 * The overwhelming majority of live rooms exist because two people want to
 * talk in the next thirty seconds. Putting a datetime field in front of that —
 * even one helpfully prefilled — makes the common case read as a scheduling
 * task, and a prefilled "now" goes stale while somebody fills in the rest of
 * the form. So the default is a toggle that means *open the doors as soon as
 * this is saved*, and the field only appears when somebody says otherwise.
 *
 * ## Why every other control is visible rather than behind "advanced"
 *
 * Because each one is a decision about other people. Who can come in, who can
 * talk, who can share a screen — these are the difference between a stand-up
 * and a presentation, and a host who does not notice them until somebody
 * interrupts has been failed by the form. They are ordered by how often they
 * are changed, not by how important they are.
 */
export const LiveRoomComposer = ({
  isOpen,
  onClose,
  projectId,
  roster,
  room,
}: LiveRoomComposerProps) => {
  const t = useT();
  const { create, update } = useLiveRoomActions(projectId);

  /*
   * Both lists are fetched only while the dialog is open.
   *
   * A project with three hundred tasks would otherwise pay for that list on
   * every visit to the tab, to fill a picker most people never touch.
   */
  const { data: documents = [] } = useProjectDocuments(isOpen ? projectId : undefined);
  const { data: tasks = [] } = useTasks(
    isOpen ? { projectId, hideCompleted: true, limit: 100 } : {},
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [opensNow, setOpensNow] = useState(true);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [audience, setAudience] = useState<LiveAudience>('EVERYONE');
  const [talkPolicy, setTalkPolicy] = useState<LivePolicy>('OPEN');
  const [screenPolicy, setScreenPolicy] = useState<LivePolicy>('OPEN');
  const [documentId, setDocumentId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // Reset, or hydrate from the room being edited, whenever the dialog opens.
  useEffect(() => {
    if (!isOpen) return;

    const opening = room ? new Date(room.opensAt) : nextQuarter();
    setTitle(room?.title ?? '');
    setDescription(room?.description ?? '');
    /*
     * A room already open reads as "now" rather than as its own past start.
     *
     * Showing `opensAt` in the field would invite somebody editing the title
     * of a running call to accidentally re-save a time in the past, which the
     * API accepts and which reads to everybody else as the room having opened
     * twice.
     */
    setOpensNow(!room || opening.getTime() <= Date.now());
    setOpensAt(toDateTimeInput(opening));
    setClosesAt(room?.closesAt ? toDateTimeInput(new Date(room.closesAt)) : '');
    setAudience(room?.audience ?? 'EVERYONE');
    setTalkPolicy(room?.talkPolicy ?? 'OPEN');
    setScreenPolicy(room?.screenPolicy ?? 'OPEN');
    setDocumentId(room?.document?.id ?? '');
    /*
     * Only the people named *directly*.
     *
     * A room's guest list also contains everybody a team or a task pulled in,
     * and pre-selecting those as though somebody had picked them by hand would
     * make the next save turn them into direct invitations — which is a
     * different fact, and one that would survive the team being removed.
     */
    setMemberIds(
      room?.members.filter((member) => member.source === 'DIRECT').map((m) => m.user.id) ?? [],
    );
    setTeamIds(room?.teams.map((team) => team.id) ?? []);
    setTaskIds(room?.tasks.map((task) => task.id) ?? []);
  }, [isOpen, room]);

  const isSaving = create.isPending || update.isPending;
  // Widened by whatever the room already holds, so editing a title on a room
  // scheduled beyond the window does not lock the form. See `dateInputBounds`.
  const bounds = dateInputBounds(opensAt, closesAt);

  const toggle = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];

  const scheduleIsValid =
    opensNow || (Boolean(opensAt) && isDateTimeInput(opensAt) && isWithinDateWindow(opensAt));

  /*
   * An empty closing time is valid — most rooms end by somebody pressing the
   * button — so this only refuses one that was filled in badly.
   */
  const closeIsValid = isDateTimeInput(closesAt) && isWithinDateWindow(closesAt);

  const canSave = title.trim().length > 0 && scheduleIsValid && closeIsValid && !isSaving;

  const handleSubmit = async () => {
    if (!canSave) return;

    const payload = {
      title: clampText(title, TEXT_LIMITS.taskTitle),
      description: description.trim() || undefined,
      // Absent means "now" to the API, which is the same sentence the toggle
      // makes here — so the common case sends no time at all.
      opensAt: opensNow ? undefined : fromDateTimeInput(opensAt),
      closesAt: fromDateTimeInput(closesAt),
      audience,
      talkPolicy,
      screenPolicy,
      documentId: documentId || undefined,
      memberIds,
      teamIds,
      taskIds,
    };

    if (room) {
      /*
       * `null` rather than `undefined` for the two clearable fields.
       *
       * The API reads an absent key as "leave it alone" and an explicit null
       * as "remove it", which is the only way an edit can take a linked
       * document or a closing time back off a room.
       */
      const patch: UpdateLiveRoomPayload = {
        ...payload,
        closesAt: payload.closesAt ?? null,
        documentId: payload.documentId ?? null,
      };
      await update.mutateAsync({ roomId: room.id, payload: patch });
    } else {
      await create.mutateAsync({ projectId, ...payload });
    }

    onClose();
  };

  /**
   * Who the chosen tasks pull in, shown back before anybody saves.
   *
   * The server does the work — a task's assignees are added to the guest list
   * and emailed (see `LiveService.announce`) — and doing it there rather than
   * here is right: the browser's copy of a task can be a minute stale, and a
   * guest list assembled from it would be wrong in a way nobody could see.
   *
   * But an invitation happening invisibly is a bad surprise, and "this will
   * email four people" is exactly the kind of thing somebody should know
   * *before* they press the button rather than afterwards. So this is a
   * preview, drawn from the task rows already in hand, and it says so.
   *
   * People already named by hand are filtered out: they are in the picker
   * above with their face lit up, and listing them twice would suggest the
   * tasks had added somebody they did not.
   */
  const pulledInByTasks = useMemo(() => {
    const seen = new Map<string, { id: string; displayName: string; avatarUrl: string | null }>();

    for (const task of tasks) {
      if (!taskIds.includes(task.id)) continue;
      for (const assignee of task.assignees) {
        if (memberIds.includes(assignee.id) || seen.has(assignee.id)) continue;
        seen.set(assignee.id, assignee);
      }
    }

    return [...seen.values()];
  }, [memberIds, taskIds, tasks]);

  const documentOptions = useMemo(
    () => [
      { value: '', label: t('live.noDocument') },
      ...documents.map((page) => ({
        value: page.id,
        label: clampText(page.title, 48),
      })),
    ],
    [documents, t],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={room ? t('live.editTitle') : t('live.newTitle')}
      description={t('live.composerHint')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave} isLoading={isSaving}>
            {room ? t('common.save') : t('live.open')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('live.titleLabel')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('live.titlePlaceholder')}
          maxLength={TEXT_LIMITS.taskTitle}
          autoFocus
        />

        <Textarea
          label={t('live.descriptionLabel')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('live.descriptionPlaceholder')}
          rows={2}
          maxLength={2000}
        />

        {/* --- When ------------------------------------------------------ */}
        <fieldset className="space-y-2 rounded-xl border border-edge p-3">
          <legend className="flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-content-muted">
            <CalendarClock className="h-3 w-3" />
            {t('live.whenLabel')}
          </legend>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: true, label: t('live.opensNow') },
                { value: false, label: t('live.opensLater') },
              ] as const
            ).map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => setOpensNow(option.value)}
                aria-pressed={opensNow === option.value}
                className={cn(
                  'ui-chip rounded-lg px-2.5 py-1 text-xs transition-colors',
                  opensNow === option.value
                    ? 'bg-brand text-brand-contrast'
                    : 'bg-surface-sunken text-content-muted hover:text-content',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!opensNow && (
            <Input
              type="datetime-local"
              label={t('live.opensAtLabel')}
              value={opensAt}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => setOpensAt(event.target.value)}
            />
          )}

          <Input
            type="datetime-local"
            label={t('live.closesAtLabel')}
            hint={t('live.closesAtHint')}
            value={closesAt}
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => setClosesAt(event.target.value)}
          />
        </fieldset>

        {/* --- Who ------------------------------------------------------- */}
        <fieldset className="space-y-3 rounded-xl border border-edge p-3">
          <legend className="flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-content-muted">
            <Users className="h-3 w-3" />
            {t('live.whoLabel')}
          </legend>

          <Select<LiveAudience>
            label={t('live.audienceLabel')}
            value={audience}
            onChange={setAudience}
            options={[
              {
                value: 'EVERYONE',
                label: t('live.audienceEveryone'),
                hint: t('live.audienceEveryoneHint'),
              },
              {
                value: 'SELECTED',
                label: t('live.audienceSelected'),
                hint: t('live.audienceSelectedHint'),
              },
            ]}
          />

          {/*
            Always shown, including for an `EVERYONE` room.

            Naming somebody there is not access — everybody already has it —
            it is *telling* them, which is a real and separate thing to want.
            Hiding the picker would make "invite the two people who need to be
            here" impossible without also shutting everybody else out.
          */}
          <InvitePicker
            isOpen={isOpen}
            label={
              audience === 'SELECTED' ? t('live.guestsLabel') : t('live.notifyLabel')
            }
            people={roster}
            selectedPeople={memberIds}
            onTogglePerson={(userId) => setMemberIds((current) => toggle(current, userId))}
            teamScope={{ projectId }}
            selectedTeams={teamIds}
            onToggleTeam={(teamId) => setTeamIds((current) => toggle(current, teamId))}
          />
        </fieldset>

        {/* --- What it is about ------------------------------------------ */}
        <fieldset className="space-y-3 rounded-xl border border-edge p-3">
          <legend className="flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-content-muted">
            <ListChecks className="h-3 w-3" />
            {t('live.subjectLabel')}
          </legend>

          {/*
            The tasks, and the sentence under them, which is the whole feature.

            Picking a task does two things a guest list cannot: it says what
            the call is about, and it reaches the people doing that work —
            including by email, which is the one case where going outside the
            app is warranted. See the API's `LiveService.announce`.
          */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">{t('live.tasksLabel')}</p>
            <p className="text-3xs leading-relaxed text-content-faint">
              {t('live.tasksHint')}
            </p>

            {tasks.length === 0 ? (
              <p className="text-2xs text-content-faint">{t('live.noTasks')}</p>
            ) : (
              <div className="scrollbar-thin flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {tasks.map((task) => {
                  const isPicked = taskIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setTaskIds((current) => toggle(current, task.id))}
                      aria-pressed={isPicked}
                      className={cn(
                        'ui-chip flex items-center gap-1.5 rounded-lg px-2 py-1 text-2xs transition-colors',
                        isPicked
                          ? 'bg-brand/15 text-content ring-1 ring-brand/50'
                          : 'bg-surface-sunken text-content-muted hover:text-content',
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      {clampText(task.title, 40)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {pulledInByTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-brand/8 px-2 py-1.5">
              <span className="text-3xs text-content-muted">{t('live.tasksAdds')}</span>
              {pulledInByTasks.map((person) => (
                <span
                  key={person.id}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-1.5 py-0.5 text-3xs"
                >
                  <Avatar name={person.displayName} src={person.avatarUrl} size="xs" />
                  {person.displayName}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Select
              label={t('live.documentLabel')}
              value={documentId}
              onChange={setDocumentId}
              options={documentOptions}
            />
            <p className="flex items-center gap-1 text-3xs text-content-faint">
              <FileText className="h-3 w-3 shrink-0" />
              {t('live.documentHint')}
            </p>
          </div>
        </fieldset>

        {/* --- What people may do ---------------------------------------- */}
        <fieldset className="space-y-3 rounded-xl border border-edge p-3">
          <legend className="flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-content-muted">
            <Mic className="h-3 w-3" />
            {t('live.permissionsLabel')}
          </legend>

          <Select<LivePolicy>
            label={t('live.talkLabel')}
            value={talkPolicy}
            onChange={setTalkPolicy}
            options={[
              { value: 'OPEN', label: t('live.talkOpen'), hint: t('live.talkOpenHint') },
              {
                value: 'LIMITED',
                label: t('live.talkLimited'),
                hint: t('live.talkLimitedHint'),
              },
            ]}
          />

          <Select<LivePolicy>
            label={t('live.screenLabel')}
            value={screenPolicy}
            onChange={setScreenPolicy}
            options={[
              { value: 'OPEN', label: t('live.screenOpen'), hint: t('live.screenOpenHint') },
              {
                value: 'LIMITED',
                label: t('live.screenLimited'),
                hint: t('live.screenLimitedHint'),
              },
            ]}
          />

          <p className="flex items-start gap-1.5 text-3xs leading-relaxed text-content-faint">
            <MonitorUp className="mt-px h-3 w-3 shrink-0" />
            {t('live.moderatorHint')}
          </p>
        </fieldset>
      </div>
    </Modal>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Lock, Minus, Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import type { ProjectRepository, RosterMember } from '@/entities/project/model/types';
import { previewTaskType } from '@/entities/task/lib/task-type';
import { useCreateTask, useUpdateTask } from '@/entities/task/model/queries';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { useTaskGroups } from '@/entities/task-group/model/queries';
import { uploadImage } from '@/entities/user/api/user.api';
import type { AttachedFileDraft } from '@/entities/user/model/types';
import { useAiStatus, useSuggestDraftSubtasks } from '@/features/ai-suggestions/model/queries';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import {
  MAX_TASK_NOTES,
  TASK_COLORS,
  TASK_PRIORITY_META,
  TASK_TYPE_META,
  TEXT_LIMITS,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampOnPaste, clampText } from '@/shared/lib/text';
import {
  DATE_WINDOW_YEARS,
  dateInputBounds,
  fromDateTimeInput,
  isDateTimeInput,
  formatDeadlineDate,
  isWithinDateWindow,
  toDateTimeInput,
} from '@/shared/lib/dates';
import {
  Badge,
  Button,
  ColorPicker,
  FileAttachmentField,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  type SelectOption,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface TaskComposerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Omitted for a personal task — work with no project behind it, created and
   * edited from the task menu. The assignee picker disappears with it: there is
   * no roster to pick from, and the task is the caller's by definition.
   */
  projectId?: string;
  roster?: RosterMember[];
  /** Present when editing an existing task. */
  task?: Task | null;
  /**
   * The grouping-board column this task is being written into, fixed.
   *
   * Set by the "+" at the top of a column on the grouping board, and the whole
   * point of that button: the tag is not a field to fill in, it is *why* the
   * composer was opened. So the picker is drawn as a read-only chip rather than
   * left editable — a locked control that can be changed is not locked, and a
   * dropdown that silently re-answers the question the button already answered
   * is how somebody ends up filing work in the wrong lane.
   *
   * The page's own "new task" button passes nothing and gets the ordinary
   * picker, which is the right shape when the column is genuinely a choice.
   */
  lockedGroupId?: string;
  /**
   * The project's own finish date, when it has one.
   *
   * A prop rather than a lookup, and deliberately so: every surface that opens
   * this composer already holds the project — the board fetched it, the
   * grouping board was handed it — so asking for it again here would be a
   * request to learn something the caller is looking at. It also keeps the
   * composer usable for a personal task, which has no project to look up.
   *
   * Absent means no ceiling, which is both the personal-task case and the
   * (common) case of a project with no deadline. When editing an existing
   * task, `task.project.endsAt` is used in preference — it is the finish date
   * of the project the task is actually *in*, which is the one that binds.
   */
  projectDeadline?: string | null;
  /**
   * The repository this project is linked to, when there is one.
   *
   * A prop for the same reason `projectDeadline` is one: every surface that
   * opens this composer is already holding the project. It decides whether the
   * branch field exists at all — the API refuses a branch on a project with no
   * repository, so offering the field there would be a control that saves
   * nothing.
   *
   * `defaultBranch` fills the placeholder, so the field suggests the shape of
   * an answer rather than sitting empty.
   */
  repository?: ProjectRepository | null;
}

const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/** Stable identity, so the default never re-triggers the hydrate effect. */
const EMPTY_ROSTER: RosterMember[] = [];

/**
 * Create/edit form for a task.
 *
 * The task *type* is never chosen by hand: it is derived from the scheduled
 * window and the number of assignees, previewed live here and re-derived
 * authoritatively by the API.
 */
export const TaskComposer = ({
  isOpen,
  onClose,
  projectId,
  roster = EMPTY_ROSTER,
  task,
  lockedGroupId,
  projectDeadline,
  repository,
}: TaskComposerProps) => {
  const t = useT();
  // No project means a personal task: one assignee, no roster, no fan-out.
  const isPersonal = !projectId;

  /*
   * The project's grouping-board columns, for the tag picker.
   *
   * Asked for only when there is a project — a personal task has no board to be
   * grouped on, so `useTaskGroups` is disabled rather than sending a request
   * that can only 404. Empty is the normal case for a project that has never
   * opened the grouping board, and the picker is hidden entirely in that case.
   */
  const { data: groups = [] } = useTaskGroups(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Cached across every surface that asks — see `useAiStatus`.
  const { data: aiStatus } = useAiStatus();
  const suggestSteps = useSuggestDraftSubtasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [branch, setBranch] = useState('');
  const [startAt, setStartAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  /**
   * Teams whose people should be assigned, offered only when creating.
   *
   * Not seeded when editing: a team is expanded into individuals at the moment
   * it is picked, so an existing task carries assignees rather than a memory of
   * which teams produced them. Re-expanding one on an edit would silently
   * re-add somebody who had deliberately been taken off.
   */
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState('');
  /**
   * Which grouping-board column to file this under, or `''` for none.
   *
   * The empty string rather than `null`, because it is bound to a `<select>`
   * and that is what an unselected option's value is. It becomes `null` on the
   * way out, which is what untags a task on the API.
   */
  const [groupId, setGroupId] = useState<string>('');
  /*
   * The picture on the form, in as much detail as this session knows.
   *
   * `key` is empty when the state was hydrated from an existing task: there is
   * a picture, but this session did not upload it, so there is no object key to
   * send and nothing about the attachment to change. A non-empty `key` means a
   * fresh upload; `null` for the whole thing means the user took it off. The
   * submit handler turns those three states into three different payloads.
   */
  const [attachment, setAttachment] = useState<{
    key: string;
    publicUrl: string;
    thumbKey: string | null;
    thumbUrl: string | null;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  /*
   * The attached document, in as much detail as this session knows.
   *
   * Same three-state trick as `attachment` above, for the same reason: an empty
   * `key` means "there is a file, but this session did not upload it", so the
   * PATCH leaves it alone; a non-empty key is a fresh upload; `null` for the
   * whole thing is the user having taken it off.
   */
  const [file, setFile] = useState<AttachedFileDraft | null>(null);

  // Reset (or hydrate) whenever the dialog opens.
  useEffect(() => {
    if (!isOpen) return;

    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setColor(task?.color ?? TASK_COLORS[0]);
    setPriority(task?.priority ?? 'NORMAL');
    setBranch(task?.branch ?? '');
    setStartAt(toDateTimeInput(task?.startAt ?? null));
    setDueAt(toDateTimeInput(task?.dueAt ?? null));
    setAssigneeIds(task?.assignees.map((assignee) => assignee.id) ?? []);
    setTeamIds([]);
    setChecklist([]);
    setChecklistDraft('');
    /*
     * The lock wins on a fresh task, and is ignored on an edit.
     *
     * Editing is opened from a card, not from a column, so a `lockedGroupId`
     * has no business overwriting the tag a task already carries — and the
     * board never passes one for an edit. Belt and braces, because getting this
     * backwards would silently re-file somebody's task on save.
     */
    setGroupId(task?.group?.id ?? (task ? '' : (lockedGroupId ?? '')));
    setAttachment(
      task?.attachmentUrl
        ? {
            key: '',
            publicUrl: task.attachmentUrl,
            thumbKey: null,
            thumbUrl: task.attachmentThumbUrl,
          }
        : null,
    );
    setFile(
      task?.file ? { key: '', name: task.file.name, size: task.file.size, url: task.file.url } : null,
    );
  }, [isOpen, lockedGroupId, task]);

  const derivedType = useMemo(
    () =>
      previewTaskType(
        fromDateTimeInput(startAt),
        fromDateTimeInput(dueAt),
        // A personal task always has exactly one assignee, so the preview says
        // so rather than reading an empty picker as "nobody".
        isPersonal ? 1 : assigneeIds.length,
      ),
    [assigneeIds.length, dueAt, isPersonal, startAt],
  );

  /*
   * Two different complaints, kept apart.
   *
   * A malformed date ("what you typed is not a date") and a backwards window
   * ("the deadline is before the start") need different words, and only the
   * first can take the form down with it — see the note in `shared/lib/dates`.
   * Both block the submit; neither throws.
   */
  const startIsMalformed = !isDateTimeInput(startAt);
  const dueIsMalformed = !isDateTimeInput(dueAt);

  /*
   * Out of range is its own complaint, separate from malformed.
   *
   * A deadline in 2100 is a real date and a typo, and telling somebody it is
   * "not a date" sends them looking for a formatting mistake that is not there.
   * See `isWithinDateWindow`.
   */
  const startIsTooFar = !startIsMalformed && !isWithinDateWindow(startAt);
  const dueIsTooFar = !dueIsMalformed && !isWithinDateWindow(dueAt);

  const windowIsInvalid =
    !startIsMalformed &&
    !dueIsMalformed &&
    Boolean(startAt && dueAt) &&
    new Date(dueAt).getTime() <= new Date(startAt).getTime();

  /*
   * The project's own finish date, when it has one.
   *
   * Read from the task being edited, or from the project list for a task being
   * created — both are already in the cache on every surface this composer
   * opens from, so neither costs a request. `null` on a personal task and on a
   * project with no deadline, which is the common case and means no ceiling.
   */
  const projectEndsAt = task?.project?.endsAt ?? projectDeadline ?? null;

  /*
   * A deadline past the end of its own project.
   *
   * Its own complaint rather than folded into `dueIsTooFar`, because it is a
   * different fact with a different remedy: "too far away" means pick an
   * earlier date, and this means pick an earlier date *or go and move the
   * project's*. The API refuses the same thing in the same words — see
   * `assertTaskWithinProject` — and this is that refusal arriving while the
   * form is still open, which is the only moment it is cheap to act on.
   */
  const dueIsAfterProject =
    !dueIsMalformed &&
    Boolean(dueAt && projectEndsAt) &&
    new Date(dueAt).getTime() > new Date(projectEndsAt as string).getTime();

  const canSubmit =
    title.trim().length >= 2 &&
    !windowIsInvalid &&
    !startIsMalformed &&
    !dueIsMalformed &&
    !startIsTooFar &&
    !dueIsTooFar &&
    !dueIsAfterProject;

  /*
   * The bounds the two controls carry, widened to admit whatever the task
   * already holds — otherwise tightening the window would make a task saved
   * with an old out-of-range date impossible to edit at all. See
   * `dateInputBounds`.
   */
  const bounds = dateInputBounds(
    toDateTimeInput(task?.startAt ?? null),
    toDateTimeInput(task?.dueAt ?? null),
  );

  /*
   * The deadline field's own ceiling: the tighter of the five-year window and
   * the project's finish date.
   *
   * Only the *deadline* gets it. A task that begins before its project ends
   * and has no deadline of its own has not overrun anything, so bounding the
   * start field would refuse something legitimate — and it cannot help anyway,
   * since a start later than the deadline is already caught by
   * `windowIsInvalid`.
   *
   * Deliberately not applied when the task already holds a later date. That is
   * the same reasoning `dateInputBounds` exists for: a project whose finish
   * date was pulled in *after* a task was scheduled would otherwise make that
   * task uneditable, and somebody fixing its title should not first have to
   * fix a date they did not set.
   */
  const projectCeiling = toDateTimeInput(projectEndsAt);
  const dueMax =
    projectCeiling && projectCeiling < bounds.max && !(task?.dueAt && toDateTimeInput(task.dueAt) > projectCeiling)
      ? projectCeiling
      : bounds.max;

  /*
   * Two renditions go up, not one.
   *
   * The second encode costs a moment of the phone's CPU and one extra presigned
   * request; what it buys is every future reader of this task downloading ~40 kB
   * instead of the whole photograph to look at a thumbnail they may never open.
   * That trade is paid once, by the person attaching it, and collected by
   * everybody on the roster every time the sheet is opened.
   */
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const uploaded = await uploadImage(file, 'attachments', { thumbnail: true });
      setAttachment({
        key: uploaded.key,
        publicUrl: uploaded.publicUrl,
        thumbKey: uploaded.thumbKey,
        thumbUrl: uploaded.thumbUrl,
      });
      toast.success(t('task.imageAttached'));
    } catch {
      toast.error(t('settings.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const shared = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      priority,
      /*
       * Sent only where it can be stored, and always sent when it can.
       *
       * The API refuses a branch on a project with no repository, so omitting
       * it there is not tidiness — it is the difference between a save and a
       * 400. Where the field *is* offered it goes on every write including an
       * empty string, because an empty string is how the branch comes back off
       * and an omitted field would read as "leave it alone".
       */
      ...(repository ? { branch: branch.trim() } : {}),
      startAt: fromDateTimeInput(startAt),
      dueAt: fromDateTimeInput(dueAt),
      // A personal task has no roster to pick from; the server assigns it to
      // its creator and rejects anybody else, so the field is simply omitted.
      ...(isPersonal ? {} : { assigneeIds }),
    };

    if (task) {
      await updateTask.mutateAsync({
        taskId: task.id,
        payload: {
          ...shared,
          startAt: fromDateTimeInput(startAt) ?? null,
          dueAt: fromDateTimeInput(dueAt) ?? null,
          /*
           * Three states, not two.
           *
           * `attachmentKey` had been sent only when this session uploaded
           * something, which quietly made removing a picture impossible: the
           * X took it off the form and the field was then simply omitted from
           * the PATCH, which the API reads as "leave it alone". Reopening the
           * task brought the picture straight back.
           *
           *   - a fresh upload  -> the new key (and its thumbnail)
           *   - cleared         -> `null`, which is how the API deletes it
           *   - untouched       -> omitted, which is how the API keeps it
           */
          ...(attachment?.key
            ? {
                attachmentKey: attachment.key,
                attachmentThumbKey: attachment.thumbKey,
              }
            : attachment === null && task.attachmentUrl
              ? { attachmentKey: null, attachmentThumbKey: null }
              : {}),
          // The document, on the same three states as the picture above.
          ...(file?.key
            ? { file: { key: file.key, name: file.name, size: file.size } }
            : file === null && task.file
              ? { file: null }
              : {}),
          /*
           * The tag, on three states as well.
           *
           * `null` when the picker was cleared — which is the only way to take
           * a task off a column from here — and omitted entirely when there are
           * no columns to choose from, so a project that has never used the
           * grouping board never sends a field about it.
           */
          ...(groups.length > 0 ? { groupId: groupId || null } : {}),
        },
      });
    } else {
      await createTask.mutateAsync({
        ...(projectId ? { projectId } : {}),
        ...shared,
        // Merged with the individual picks above by the API; empty is omitted.
        ...(!isPersonal && teamIds.length > 0 ? { teamIds } : {}),
        checklist: checklist.length > 0 ? checklist : undefined,
        ...(groupId ? { groupId } : {}),
        attachmentKey: attachment?.key || undefined,
        attachmentThumbKey: attachment?.thumbKey ?? undefined,
        file: file?.key ? { key: file.key, name: file.name, size: file.size } : undefined,
      });
    }

    onClose();
  };

  const selectedGroup = groups.find((group) => group.id === groupId) ?? null;
  /** Locked only if the column it names actually exists on this project. */
  const isGroupLocked = Boolean(!task && lockedGroupId && selectedGroup);

  /**
   * What the tag picker offers: "no group", then every column.
   *
   * A `SelectOption[]` rather than raw `<option>`s, because this is now the
   * app's own listbox instead of the OS's. The swatch is the whole reason it is
   * worth the change on this particular field — the columns are told apart by
   * colour on the board, and a dropdown of bare words made the picker the one
   * place they were not.
   */
  const groupOptions: SelectOption<string>[] = [
    { value: '', label: t('groups.noTag') },
    ...groups.map((group) => ({ value: group.id, label: group.name, swatch: group.color })),
  ];

  const typeMeta = TASK_TYPE_META[derivedType];
  const isPending = createTask.isPending || updateTask.isPending;

  /*
   * The assistant, and the two things it insists on first.
   *
   * A title and a description, both of them written, before the button does
   * anything. Not politeness: `POST /ai/tasks/draft-subtasks` has nothing else
   * to go on — there is no task row, no type, no board around it — so asking it
   * to break down "Untitled" produces three confident sentences about nothing
   * and spends a call against a free-tier quota to do it. The button says why
   * it is closed rather than being hidden, because the fix is one field away.
   */
  const canSuggestSteps =
    title.trim().length >= 2 && description.trim().length >= 2;
  const checklistIsFull = checklist.length >= MAX_TASK_NOTES;

  /**
   * One more starting step, if there is room for it.
   *
   * The cap is `MAX_TASK_NOTES`, which is what `CreateTaskDto` accepts — this
   * field had none at all, so typing a fourth step produced a form that looked
   * complete and a save the API rejected with a validation error naming a field
   * called `checklist` that nothing on screen is called.
   */
  const addStep = () => {
    const step = checklistDraft.trim();
    if (!step) return;

    setChecklist((items) => (items.length >= MAX_TASK_NOTES ? items : [...items, step]));
    setChecklistDraft('');
  };

  const handleSuggestSteps = async () => {
    if (!canSuggestSteps || checklistIsFull) return;

    try {
      const suggestion = await suggestSteps.mutateAsync({
        title: title.trim(),
        description: description.trim(),
      });

      const proposed = (suggestion.result.suggestions ?? []).map((item) => item.title.trim());

      /*
       * Merged into what is already there, not dropped on top of it.
       *
       * Somebody who typed two steps and then pressed the sparkle wants a third
       * suggested, not their own two replaced — and the duplicate check matters
       * because the model is being asked to expand on a description that
       * probably mentions the steps already written.
       */
      setChecklist((current) => {
        const seen = new Set(current.map((item) => item.toLowerCase()));
        const additions = proposed.filter(
          (item) => item.length > 0 && !seen.has(item.toLowerCase()),
        );

        return [...current, ...additions].slice(0, MAX_TASK_NOTES);
      });
    } catch {
      // `useSuggestDraftSubtasks` has already toasted what went wrong.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(
        task ? 'task.editTitle' : isPersonal ? 'agenda.newPersonalTask' : 'task.newTitle',
      )}
      description={t(isPersonal ? 'agenda.personalComposerBody' : 'task.composerSubtitle')}
      className="sm:max-w-2xl"
      // A task sheet is the densest surface in the app; the skin keeps its
      // palette, border and shadow here but gives up its pattern.
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={isPending}
            disabled={!canSubmit}
          >
            {t(task ? 'task.saveChanges' : 'task.create')}
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-surface-sunken px-3.5 py-3">
          <div className="min-w-0">
            <TaskTypeTag type={derivedType} variant="full" />
            <p className="truncate text-2xs text-content-muted">{t(typeMeta.hint)}</p>
          </div>
          <Badge className="shrink-0">{t('task.autoClassified')}</Badge>
        </div>

        {/* `clampText` as well as `maxLength` on both — see `shared/lib/text`. */}
        <Input
          label={t('task.titleLabel')}
          name="title"
          value={title}
          onChange={(event) => setTitle(clampText(event.target.value, TEXT_LIMITS.taskTitle))}
          placeholder={t('task.titlePlaceholder')}
          maxLength={TEXT_LIMITS.taskTitle}
          hint={
            title.length > TEXT_LIMITS.taskTitle - 20
              ? `${title.length}/${TEXT_LIMITS.taskTitle}`
              : undefined
          }
          autoFocus
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) =>
            setDescription(clampText(event.target.value, TEXT_LIMITS.taskDescription))
          }
          placeholder={t('task.descriptionPlaceholder')}
          maxLength={TEXT_LIMITS.taskDescription}
          hint={
            description.length > TEXT_LIMITS.taskDescription - 200
              ? `${description.length}/${TEXT_LIMITS.taskDescription}`
              : undefined
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* `min`/`max` are what make the browser mark an out-of-range year
              invalid as it is typed, so the picker itself refuses to walk out
              to 2100. They are a courtesy, not the control: the check that
              actually decides is `canSubmit`, and the API enforces the same
              window again — see `assertValidWindow`. */}
          <Input
            label={t('task.starts')}
            name="startAt"
            type="datetime-local"
            min={bounds.min}
            max={bounds.max}
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            error={
              startIsMalformed
                ? t('task.dateInvalid')
                : startIsTooFar
                  ? t('task.dateOutOfRange', { years: String(DATE_WINDOW_YEARS) })
                  : undefined
            }
          />
          <Input
            label={t('task.deadline')}
            name="dueAt"
            type="datetime-local"
            min={bounds.min}
            max={dueMax}
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            error={
              dueIsMalformed
                ? t('task.dateInvalid')
                : dueIsTooFar
                  ? t('task.dateOutOfRange', { years: String(DATE_WINDOW_YEARS) })
                  : windowIsInvalid
                    ? t('task.windowInvalid')
                    : dueIsAfterProject
                      ? t('task.afterProjectEnd', {
                          date: formatDeadlineDate(projectEndsAt as string),
                        })
                      : undefined
            }
          />
        </div>

        {/*
          Who is on this — named one at a time, or a whole team at once.

          One control with two tabs rather than the two stacked lists this used
          to be, and individuals is the tab it opens on: naming two people is
          what most tasks need, and a team is the shortcut for when the answer
          already has a name. The teams tab only exists while creating — see the
          `teamIds` state for why editing does not offer it — and disappears
          entirely on a project with no teams.
        */}
        {!isPersonal && (
          <div className="space-y-1.5">
            <InvitePicker
              people={roster}
              selectedPeople={assigneeIds}
              onTogglePerson={(userId) =>
                setAssigneeIds((current) =>
                  current.includes(userId)
                    ? current.filter((id) => id !== userId)
                    : [...current, userId],
                )
              }
              teamScope={!task && projectId ? { projectId } : null}
              selectedTeams={teamIds}
              onToggleTeam={(teamId) =>
                setTeamIds((current) =>
                  current.includes(teamId)
                    ? current.filter((id) => id !== teamId)
                    : [...current, teamId],
                )
              }
              isOpen={isOpen}
              label={t('task.assignees')}
            />

            {assigneeIds.length > 1 && (
              <p className="text-2xs text-emerald-500">{t('task.multiTaskNote')}</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPicker label={t('task.colour')} value={color} onChange={setColor} options={TASK_COLORS} />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">{t('task.priority')}</p>
            <div className="flex flex-wrap gap-1.5">
              {/*
                The word, not the enum.

                These four buttons were printing `option.toLowerCase()` — the
                raw `TaskPriority` value — which is English on every screen in
                the app regardless of the language chosen, and is the only place
                a task's priority was not translated. `TASK_PRIORITY_META`
                already holds the key every card, badge and filter reads it
                through; this was simply not going through it.
              */}
              {PRIORITIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  aria-pressed={priority === option}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    priority === option
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-edge text-content-muted hover:text-content',
                  )}
                >
                  {t(TASK_PRIORITY_META[option].label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/*
          The branch this work happens on.

          Drawn only on a project with a repository linked, because the API
          refuses a branch anywhere else — a field that cannot save is worse
          than a field that is not there, and the button that *would* make it
          appear is beside the project's own name, which is where somebody
          looking for it will get to.

          Free text with the repository's default branch as the placeholder.
          Not a dropdown of real branches, and that is deliberate: the branch is
          routinely cut *after* the task that names it, so a list of what exists
          today would refuse the ordinary case — a task written on Monday for a
          branch made on Tuesday.
        */}
        {repository && (
          <Input
            label={t('task.branch')}
            name="branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value.slice(0, 200))}
            placeholder={repository.defaultBranch ?? t('task.branchPlaceholder')}
            maxLength={200}
            hint={t('task.branchHint')}
          />
        )}

        {/*
          The grouping-board tag.

          Absent entirely until the project has invented at least one column,
          which is the point: a picker with nothing in it is a control that
          teaches the reader a feature exists by refusing to do anything. A
          project that never opens the grouping board never sees this field.

          Also absent on a personal task, which has no board to be grouped on —
          `useTaskGroups` is not even asked in that case.

          ## Why this is `Select` and not a `<select>`

          It was the native control, and it was the one field on this sheet that
          belonged to a different application. A native `<select>` is drawn by
          the operating system: it takes the skin's border and radius tokens as
          suggestions and its own type as gospel. Two things followed from that,
          and both were bugs rather than matters of taste.

          The first is that the text was clipped. The box was forced to `h-9`
          (36px) with `text-xs`, and the app's own iOS-zoom guard raises every
          `select` to 16px below `md` — a 16px line in a 36px box that also has
          to hold the OS's own vertical padding, so on a phone the column name
          was cut off top and bottom. The second is that on the skins that run a
          heavier face — the vintage serif, the arcade's pixel type — the
          native control kept the system font while every other field on the
          sheet changed, which is why it read as unstyled on the default skin
          and outright foreign on the rest.

          `Select` is the app's own listbox: same border, same radius token,
          same motion curve, same type as the fields around it, and it carries
          the column's colour as a swatch on the trigger *and* in the list —
          which the old separate circle beside the box could only do for the
          current value.
        */}
        {groups.length > 0 && (
          <div className="space-y-1.5">
            {isGroupLocked ? (
              /*
                Opened from a column, so the column is not a question.

                Drawn as a chip rather than as a disabled dropdown: a greyed-out
                control invites a click that does nothing, and this is not a
                field that failed to load — it is an answer that was given by
                the button that opened this sheet.
              */
              <>
                <p className="text-xs font-medium text-content-muted">{t('groups.tagLabel')}</p>
                <p
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-xl border border-edge bg-surface-sunken',
                    'px-2.5 text-xs',
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: selectedGroup?.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {selectedGroup?.name}
                  </span>
                  <Lock
                    aria-hidden
                    className="h-3 w-3 shrink-0 text-content-faint"
                    strokeWidth={2.4}
                  />
                  <span className="sr-only">{t('groups.tagLocked')}</span>
                </p>
              </>
            ) : (
              <Select
                label={t('groups.tagLabel')}
                value={groupId}
                options={groupOptions}
                onChange={setGroupId}
              />
            )}
          </div>
        )}

        {!task && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-content-muted">
                {t('task.subChecklist')}{' '}
                <span className="text-content-faint tabular-nums">
                  ({checklist.length}/{MAX_TASK_NOTES})
                </span>
              </p>

              {/*
                The assistant, on the sheet where the task is still being written.

                The same feature the task sheet has, moved one step earlier —
                and that is the whole of the difference. On the sheet the model
                reads a saved row; here it reads what has been typed, which is
                why the button waits for both a title *and* a description before
                it will do anything: those two fields are the entire prompt, and
                "Untitled" with nothing under it produces three confident
                sentences about nothing at a cost against a free-tier quota.

                Disabled with a reason rather than hidden, unlike the sheet's
                version. There the button is absent when the model is not
                configured, because that is a promise the deployment cannot
                keep. Here the block is usually the user's own two empty fields,
                and a control that says what it is waiting for is how they find
                that out. It still disappears entirely with no model behind it.
              */}
              {aiStatus?.enabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => void handleSuggestSteps()}
                  isLoading={suggestSteps.isPending}
                  disabled={!canSuggestSteps || checklistIsFull}
                  title={t(
                    checklistIsFull
                      ? 'task.stepsFull'
                      : canSuggestSteps
                        ? 'task.suggestStepsHint'
                        : 'ai.needsTitleAndBody',
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('task.suggestSteps')}
                </Button>
              )}
            </div>

            {/* Says it out loud as well as in the tooltip: a disabled button
                somebody cannot hover is a dead end on a touch screen. */}
            {aiStatus?.enabled && !canSuggestSteps && !checklistIsFull && (
              <p className="text-2xs text-content-faint">{t('ai.needsTitleAndBody')}</p>
            )}

            <div className="flex gap-2">
              <input
                value={checklistDraft}
                onChange={(event) =>
                  setChecklistDraft(clampText(event.target.value, TEXT_LIMITS.checklistItem))
                }
                onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.checklistItem)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  addStep();
                }}
                placeholder={t(checklistIsFull ? 'task.stepsFull' : 'task.addStep')}
                maxLength={TEXT_LIMITS.checklistItem}
                disabled={checklistIsFull}
                className="field disabled:opacity-60"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t('task.addChecklistItem')}
                disabled={checklistIsFull}
                onClick={addStep}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {checklist.length > 0 && (
              <ul className="space-y-1.5">
                {checklist.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 break-words">{item}</span>
                    <button
                      type="button"
                      aria-label={t('task.removeStep', { step: item })}
                      onClick={() =>
                        setChecklist((items) => items.filter((_, at) => at !== index))
                      }
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-content-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-content-muted">{t('task.imageAttachment')}</p>

          {attachment ? (
            <div className="relative overflow-hidden rounded-xl border border-edge bg-surface-sunken">
              {/* `object-contain`: a preview that crops is a preview of
                  something else. The small rendition is used where there is
                  one, so re-opening the composer to edit a task does not
                  re-download the full-size picture. */}
              <img
                src={attachment.thumbUrl ?? attachment.publicUrl}
                alt="Task attachment"
                className="mx-auto max-h-40 w-full object-contain"
              />
              <button
                type="button"
                aria-label={t('task.removeAttachment')}
                onClick={() => setAttachment(null)}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-edge',
                'px-4 py-6 text-xs text-content-muted transition-colors hover:border-brand hover:text-brand',
              )}
            >
              {isUploading ? (
                <Spinner />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {isUploading ? t('settings.uploading') : t('task.attachImage')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked) void handleUpload(picked);
                }}
              />
            </label>
          )}
        </div>

        {/*
          A paper, beside the picture.

          Two separate slots rather than one "attachment" that could be either,
          because they are read in completely different ways: the picture is
          drawn on the sheet, and the document is something you take away and
          open elsewhere. A task that has both — a photo of the whiteboard and
          the spec it turned into — is the normal case, not a conflict.
        */}
        <FileAttachmentField
          label={t('task.documentAttachment')}
          value={file}
          onChange={setFile}
        />
      </form>
    </Modal>
  );
};

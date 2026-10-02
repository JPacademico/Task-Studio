import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Lock, MessagesSquare, Minus, Plus, Sparkles, X } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import type { ProjectRepository, RosterMember } from '@/entities/project/model/types';
import { previewTaskType } from '@/entities/task/lib/task-type';
import { useCreateTask, useUpdateTask } from '@/entities/task/model/queries';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { useTaskGroups } from '@/entities/task-group/model/queries';
import { uploadImage } from '@/entities/user/api/user.api';
import type { AttachedFileDraft } from '@/entities/user/model/types';
import {
  hasAiCreditsLeft,
  useAiStatus,
  useSuggestDraftSubtasks,
} from '@/features/ai-suggestions/model/queries';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import {
  CHECKLIST_PAGE_SIZE,
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
  formatCalendarDate,
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
  Pager,
  Select,
  Spinner,
  Textarea,
  usePagedList,
  type SelectOption,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface TaskComposerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Omitted for a personal task — work with no project behind it, created and edited from the task
   * menu.
   */
  projectId?: string;
  roster?: RosterMember[];
  /** Present when editing an existing task. */
  task?: Task | null;
  /**
   * The grouping-board column this task is being written into, fixed. Set by the "+" at the top of
   * a column on the grouping board, and the whole point of that button.
   */
  lockedGroupId?: string;
  /**
   * The project's own finish date, when it has one. A prop rather than a lookup, and deliberately
   * so: every surface that opens this composer already holds the project.
   */
  projectDeadline?: string | null;
  /**
   * The repository this project is linked to, when there is one. A prop for the same reason
   * `projectDeadline` is one.
   */
  repository?: ProjectRepository | null;
}

const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/** Stable identity, so the default never re-triggers the hydrate effect. */
const EMPTY_ROSTER: RosterMember[] = [];

/**
 * Create/edit form for a task. The task *type* is never chosen by hand: it is derived from the
 * scheduled window and the number of assignees.
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

  // The project's grouping-board columns, for the tag picker.
  const { data: groups = [] } = useTaskGroups(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Cached across every surface that asks — see `useAiStatus`.
  const { data: aiStatus } = useAiStatus();
  // Whether there is a call left to spend this month. A third reason the button can be unavailable,
  // alongside "the checklist is full" and "you have not typed enough yet".
  const hasAiCredits = hasAiCreditsLeft(aiStatus);
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
   * Teams whose people should be assigned, offered only when creating. Not seeded when editing: a
   * team is expanded into individuals at the moment it is picked.
   */
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState('');
  /**
   * Which grouping-board column to file this under, or `''` for none. The empty string rather than
   * `null`, because it is bound to a `<select>` and that is what an unselected option's value is.
   */
  const [groupId, setGroupId] = useState<string>('');
  /** A comment thread in the project chat. Off unless asked for; never on a personal task. */
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  // The picture on the form, in as much detail as this session knows. `key` is empty when the state
  // was hydrated from an existing task: there is a picture.
  const [attachment, setAttachment] = useState<{
    key: string;
    publicUrl: string;
    thumbKey: string | null;
    thumbUrl: string | null;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // The attached document, in as much detail as this session knows. Same three-state trick as
  // `attachment` above, for the same reason: an empty `key` means "there is a file.
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
    // The lock wins on a fresh task, and is ignored on an edit. Editing is opened from a card, not
    // from a column.
    setGroupId(task?.group?.id ?? (task ? '' : (lockedGroupId ?? '')));
    setCommentsEnabled(Boolean(task?.commentsEnabled));
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

  // Two different complaints, kept apart. A malformed date ("what you typed is not a date") and a
  // backwards window ("the deadline is before the start") need different words.
  const startIsMalformed = !isDateTimeInput(startAt);
  const dueIsMalformed = !isDateTimeInput(dueAt);

  // Out of range is its own complaint, separate from malformed. A deadline in 2100 is a real date
  // and a typo.
  const startIsTooFar = !startIsMalformed && !isWithinDateWindow(startAt);
  const dueIsTooFar = !dueIsMalformed && !isWithinDateWindow(dueAt);

  const windowIsInvalid =
    !startIsMalformed &&
    !dueIsMalformed &&
    Boolean(startAt && dueAt) &&
    new Date(dueAt).getTime() <= new Date(startAt).getTime();

  // The project's own finish date, when it has one. Read from the task being edited, or from the
  // project list for a task being created.
  const projectEndsAt = task?.project?.endsAt ?? projectDeadline ?? null;

  // A deadline past the end of its own project. Its own complaint rather than folded into
  // `dueIsTooFar`, because it is a different fact with a different remedy.
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

  // The bounds the two controls carry, widened to admit whatever the task already holds.
  const bounds = dateInputBounds(
    toDateTimeInput(task?.startAt ?? null),
    toDateTimeInput(task?.dueAt ?? null),
  );

  // The deadline field's own ceiling: the tighter of the five-year window and the project's finish
  // date. Only the *deadline* gets it.
  const projectCeiling = toDateTimeInput(projectEndsAt);
  const dueMax =
    projectCeiling && projectCeiling < bounds.max && !(task?.dueAt && toDateTimeInput(task.dueAt) > projectCeiling)
      ? projectCeiling
      : bounds.max;

  // Two renditions go up, not one. The second encode costs a moment of the phone's CPU and one
  // extra presigned request.
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

    // The step somebody typed and did not press Enter on. `addStep` is wired to Enter and to the
    // "+" button.
    const pendingStep = checklistDraft.trim();
    const steps =
      pendingStep && checklist.length < MAX_TASK_NOTES
        ? [...checklist, pendingStep]
        : checklist;

    const shared = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      priority,
      // Sent only where it can be stored, and always sent when it can. The API refuses a branch on
      // a project with no repository, so omitting it there is not tidiness.
      ...(repository ? { branch: branch.trim() } : {}),
      startAt: fromDateTimeInput(startAt),
      dueAt: fromDateTimeInput(dueAt),
      // A personal task has no roster to pick from; the server assigns it to
      // its creator and rejects anybody else, so the field is simply omitted.
      ...(isPersonal ? {} : { assigneeIds, commentsEnabled }),
    };

    if (task) {
      await updateTask.mutateAsync({
        taskId: task.id,
        payload: {
          ...shared,
          startAt: fromDateTimeInput(startAt) ?? null,
          dueAt: fromDateTimeInput(dueAt) ?? null,
          // Three states, not two. `attachmentKey` had been sent only when this session uploaded
          // something, which quietly made removing a picture impossible.
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
          // The tag, on three states as well. `null` when the picker was cleared — which is the
          // only way to take a task off a column from here.
          ...(groups.length > 0 ? { groupId: groupId || null } : {}),
        },
      });
    } else {
      await createTask.mutateAsync({
        ...(projectId ? { projectId } : {}),
        ...shared,
        // Merged with the individual picks above by the API; empty is omitted.
        ...(!isPersonal && teamIds.length > 0 ? { teamIds } : {}),
        checklist: steps.length > 0 ? steps : undefined,
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
   * What the tag picker offers: "no group", then every column. A `SelectOption[]` rather than raw
   * `<option>`s, because this is now the app's own listbox instead of the OS's.
   */
  const groupOptions: SelectOption<string>[] = [
    { value: '', label: t('groups.noTag') },
    ...groups.map((group) => ({ value: group.id, label: group.name, swatch: group.color })),
  ];

  const typeMeta = TASK_TYPE_META[derivedType];
  const isPending = createTask.isPending || updateTask.isPending;

  // The assistant, and the two things it insists on first. A title and a description, both of them
  // written, before the button does anything.
  const canSuggestSteps =
    title.trim().length >= 2 && description.trim().length >= 2;
  const checklistIsFull = checklist.length >= MAX_TASK_NOTES;
  const checklistPage = usePagedList(checklist, CHECKLIST_PAGE_SIZE, true);

  /**
   * One more starting step, if there is room for it. The cap is `MAX_TASK_NOTES`, which is what
   * `CreateTaskDto` accepts — this field had none at all.
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

      // Merged into what is already there, not dropped on top of it. Somebody who typed two steps
      // and then pressed the sparkle wants a third suggested, not their own two replaced.
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
          {/* `min`/`max` are what make the browser mark an out-of-range year invalid as it is
              typed, so the picker itself refuses to walk out to 2100. */}
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

        {/* Who is on this — named one at a time, or a whole team at once. */}
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
              {/* The word, not the enum. These four buttons were printing
                  `option.toLowerCase()` — the raw `TaskPriority` value. */}
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

        {/* The branch this work happens on. Drawn only on a project with a repository linked,
            because the API refuses a branch anywhere else. */}
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

        {/* The grouping-board tag. Absent entirely until the project has invented at least one
            column, which is the point. */}
        {groups.length > 0 && (
          <div className="space-y-1.5">
            {isGroupLocked ? (
              /* Opened from a column, so the column is not a question. Drawn as a chip rather than
                 as a disabled dropdown: a greyed-out control invites a click that does nothing. */
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

        {/* The thread, which lives under Chat → Tasks. A project's chat is where it is read, so
            a personal task has no such switch. */}
        {!isPersonal && (
          <button
            type="button"
            role="checkbox"
            aria-checked={commentsEnabled}
            onClick={() => setCommentsEnabled((on) => !on)}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
              commentsEnabled
                ? 'border-brand/50 bg-brand/[0.06]'
                : 'border-edge bg-surface-sunken hover:border-brand/40',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                commentsEnabled
                  ? 'border-brand bg-brand text-brand-contrast'
                  : 'border-check bg-surface',
              )}
            >
              {commentsEnabled && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-content">
                <MessagesSquare className="h-3.5 w-3.5 text-content-faint" aria-hidden />
                {t('task.allowComments')}
              </span>
              <span className="mt-0.5 block text-2xs leading-relaxed text-content-muted">
                {t('task.allowCommentsHint')}
              </span>
            </span>
          </button>
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

              {/* The assistant, on the sheet where the task is still being written. The same
                  feature the task sheet has, moved one step earlier. */}
              {aiStatus?.enabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => void handleSuggestSteps()}
                  isLoading={suggestSteps.isPending}
                  disabled={!canSuggestSteps || checklistIsFull || !hasAiCredits}
                  /* Ordered by which reason the reader should act on first. A spent allowance
                     outranks the other two. */
                  title={
                    !hasAiCredits
                      ? t('ai.noCreditsLeft')
                      : t(
                          checklistIsFull
                            ? 'task.stepsFull'
                            : canSuggestSteps
                              ? 'task.suggestStepsHint'
                              : 'ai.needsTitleAndBody',
                          { max: String(MAX_TASK_NOTES) },
                        )
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('task.suggestSteps')}
                </Button>
              )}
            </div>

            {/* Says it out loud as well as in the tooltip: a disabled button somebody cannot
                hover is a dead end on a touch screen. */}
            {aiStatus?.enabled && !hasAiCredits && aiStatus.allowance && (
              <p className="text-2xs text-content-faint">
                {t('ai.noCreditsLeftBody', {
                  limit: aiStatus.allowance.limit ?? 0,
                  date: formatCalendarDate(aiStatus.allowance.resetsAt),
                })}
              </p>
            )}

            {aiStatus?.enabled && hasAiCredits && !canSuggestSteps && !checklistIsFull && (
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
                placeholder={t(checklistIsFull ? 'task.stepsFull' : 'task.addStep', {
                  max: String(MAX_TASK_NOTES),
                })}
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
                {checklistPage.items.map((item, pageIndex) => {
                  const index = checklistPage.offset + pageIndex;
                  return (
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
                  );
                })}
              </ul>
            )}

            <Pager
              page={checklistPage.page}
              pages={checklistPage.pages}
              onChange={checklistPage.setPage}
            />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-content-muted">{t('task.imageAttachment')}</p>

          {attachment ? (
            <div className="relative overflow-hidden rounded-xl border border-edge bg-surface-sunken">
              {/* `object-contain`: a preview that crops is a preview of something else. The
                  small rendition is used where there is one. */}
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

        {/* A paper, beside the picture. Two separate slots rather than one "attachment" that
            could be either, because they are read in completely different ways. */}
        <FileAttachmentField
          label={t('task.documentAttachment')}
          value={file}
          onChange={setFile}
        />
      </form>
    </Modal>
  );
};

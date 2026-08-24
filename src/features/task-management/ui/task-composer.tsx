import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import type { RosterMember } from '@/entities/project/model/types';
import { previewTaskType } from '@/entities/task/lib/task-type';
import { useCreateTask, useUpdateTask } from '@/entities/task/model/queries';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { uploadImage } from '@/entities/user/api/user.api';
import type { AttachedFileDraft } from '@/entities/user/model/types';
import { InvitePicker } from '@/features/invite-picker/ui/invite-picker';
import { TASK_COLORS, TASK_TYPE_META, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import {
  DATE_INPUT_MAX,
  DATE_INPUT_MIN,
  fromDateTimeInput,
  isDateTimeInput,
  toDateTimeInput,
} from '@/shared/lib/dates';
import {
  Badge,
  Button,
  ColorPicker,
  FileAttachmentField,
  Input,
  Modal,
  Spinner,
  Textarea,
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
}: TaskComposerProps) => {
  const t = useT();
  // No project means a personal task: one assignee, no roster, no fan-out.
  const isPersonal = !projectId;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
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
    setStartAt(toDateTimeInput(task?.startAt ?? null));
    setDueAt(toDateTimeInput(task?.dueAt ?? null));
    setAssigneeIds(task?.assignees.map((assignee) => assignee.id) ?? []);
    setTeamIds([]);
    setChecklist([]);
    setChecklistDraft('');
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
  }, [isOpen, task]);

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

  const windowIsInvalid =
    !startIsMalformed &&
    !dueIsMalformed &&
    Boolean(startAt && dueAt) &&
    new Date(dueAt).getTime() <= new Date(startAt).getTime();

  const canSubmit =
    title.trim().length >= 2 && !windowIsInvalid && !startIsMalformed && !dueIsMalformed;

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
        },
      });
    } else {
      await createTask.mutateAsync({
        ...(projectId ? { projectId } : {}),
        ...shared,
        // Merged with the individual picks above by the API; empty is omitted.
        ...(!isPersonal && teamIds.length > 0 ? { teamIds } : {}),
        checklist: checklist.length > 0 ? checklist : undefined,
        attachmentKey: attachment?.key || undefined,
        attachmentThumbKey: attachment?.thumbKey ?? undefined,
        file: file?.key ? { key: file.key, name: file.name, size: file.size } : undefined,
      });
    }

    onClose();
  };

  const typeMeta = TASK_TYPE_META[derivedType];
  const isPending = createTask.isPending || updateTask.isPending;

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
            <p className="truncate text-[11px] text-content-muted">{t(typeMeta.hint)}</p>
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
          {/* `min`/`max` are what stop a six-digit year being typed in the
              first place: the control marks itself invalid as it goes, rather
              than handing back a string nothing can parse. */}
          <Input
            label={t('task.starts')}
            name="startAt"
            type="datetime-local"
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            error={startIsMalformed ? t('task.dateInvalid') : undefined}
          />
          <Input
            label={t('task.deadline')}
            name="dueAt"
            type="datetime-local"
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            error={
              dueIsMalformed
                ? t('task.dateInvalid')
                : windowIsInvalid
                  ? t('task.windowInvalid')
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
              <p className="text-[11px] text-emerald-500">{t('task.multiTaskNote')}</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPicker label={t('task.colour')} value={color} onChange={setColor} options={TASK_COLORS} />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">{t('task.priority')}</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    priority === option
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-edge text-content-muted hover:text-content',
                  )}
                >
                  {option.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!task && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-content-muted">
              {t('task.subChecklist')}{' '}
              {checklist.length > 0 && (
                <span className="text-content-faint">({checklist.length})</span>
              )}
            </p>

            <div className="flex gap-2">
              <input
                value={checklistDraft}
                onChange={(event) =>
                  setChecklistDraft(clampText(event.target.value, TEXT_LIMITS.checklistItem))
                }
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!checklistDraft.trim()) return;
                  setChecklist((items) => [...items, checklistDraft.trim()]);
                  setChecklistDraft('');
                }}
                placeholder={t('task.addStep')}
                maxLength={TEXT_LIMITS.checklistItem}
                className="field"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t('task.addChecklistItem')}
                onClick={() => {
                  if (!checklistDraft.trim()) return;
                  setChecklist((items) => [...items, checklistDraft.trim()]);
                  setChecklistDraft('');
                }}
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
                      aria-label={`Remove ${item}`}
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

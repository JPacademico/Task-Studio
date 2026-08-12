import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import type { RosterMember } from '@/entities/project/model/types';
import { previewTaskType } from '@/entities/task/lib/task-type';
import { useCreateTask, useUpdateTask } from '@/entities/task/model/queries';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { uploadImage } from '@/entities/user/api/user.api';
import { TASK_COLORS, TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { fromDateTimeInput, toDateTimeInput } from '@/shared/lib/dates';
import { Avatar, Badge, Button, ColorPicker, Input, Modal, Spinner, Textarea } from '@/shared/ui';

interface TaskComposerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  roster: RosterMember[];
  /** Present when editing an existing task. */
  task?: Task | null;
}

const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

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
  roster,
  task,
}: TaskComposerProps) => {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [startAt, setStartAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [attachment, setAttachment] = useState<{ key: string; publicUrl: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    setChecklist([]);
    setChecklistDraft('');
    setAttachment(
      task?.attachmentUrl ? { key: '', publicUrl: task.attachmentUrl } : null,
    );
  }, [isOpen, task]);

  const derivedType = useMemo(
    () =>
      previewTaskType(
        fromDateTimeInput(startAt),
        fromDateTimeInput(dueAt),
        assigneeIds.length,
      ),
    [assigneeIds.length, dueAt, startAt],
  );

  const windowIsInvalid =
    Boolean(startAt && dueAt) && new Date(dueAt).getTime() <= new Date(startAt).getTime();

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      setAttachment(await uploadImage(file, 'attachments'));
      toast.success('Image attached.');
    } catch {
      toast.error('Could not upload the image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (title.trim().length < 2 || windowIsInvalid) return;

    const shared = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      priority,
      startAt: fromDateTimeInput(startAt),
      dueAt: fromDateTimeInput(dueAt),
      assigneeIds,
    };

    if (task) {
      await updateTask.mutateAsync({
        taskId: task.id,
        payload: {
          ...shared,
          startAt: fromDateTimeInput(startAt) ?? null,
          dueAt: fromDateTimeInput(dueAt) ?? null,
          ...(attachment?.key ? { attachmentKey: attachment.key } : {}),
        },
      });
    } else {
      await createTask.mutateAsync({
        projectId,
        ...shared,
        checklist: checklist.length > 0 ? checklist : undefined,
        attachmentKey: attachment?.key || undefined,
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
      title={task ? 'Edit task' : 'New task'}
      description="The type is derived from the schedule and the assignees."
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={isPending}
            disabled={title.trim().length < 2 || windowIsInvalid}
          >
            {task ? 'Save changes' : 'Create task'}
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
            <p className="truncate text-[11px] text-content-muted">{typeMeta.hint}</p>
          </div>
          <Badge className="shrink-0">auto-classified</Badge>
        </div>

        <Input
          label="Title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ship the onboarding flow"
          maxLength={140}
          autoFocus
        />

        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Context, links, acceptance criteria…"
          maxLength={4000}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts"
            name="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
          <Input
            label="Deadline"
            name="dueAt"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            error={windowIsInvalid ? 'The deadline must come after the start.' : undefined}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-content-muted">
            Assignees{' '}
            <span className="text-content-faint">
              ({assigneeIds.length}/{roster.length})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {roster.map((member) => {
              const isSelected = assigneeIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setAssigneeIds((current) =>
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
                  {member.displayName}
                  {/* Says what the click will do, rather than only what is on. */}
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 place-items-center rounded-full',
                      isSelected ? 'bg-brand text-brand-contrast' : 'bg-surface-sunken',
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    ) : (
                      <Plus className="h-2.5 w-2.5" strokeWidth={3.5} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {assigneeIds.length > 1 && (
            <p className="text-[11px] text-emerald-500">
              More than one assignee — this becomes a MultiTask.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPicker label="Colour" value={color} onChange={setColor} options={TASK_COLORS} />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-content-muted">Priority</p>
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
              Sub-checklist{' '}
              {checklist.length > 0 && (
                <span className="text-content-faint">({checklist.length})</span>
              )}
            </p>

            <div className="flex gap-2">
              <input
                value={checklistDraft}
                onChange={(event) => setChecklistDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!checklistDraft.trim()) return;
                  setChecklist((items) => [...items, checklistDraft.trim()]);
                  setChecklistDraft('');
                }}
                placeholder="Add a step and press Enter"
                className="field"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Add checklist item"
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
                    <span>{item}</span>
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
          <p className="text-xs font-medium text-content-muted">Image attachment</p>

          {attachment ? (
            <div className="relative overflow-hidden rounded-xl border border-edge">
              <img
                src={attachment.publicUrl}
                alt="Task attachment"
                className="max-h-40 w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remove attachment"
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
              {isUploading ? 'Uploading…' : 'Attach an image (max 5 MB)'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
};

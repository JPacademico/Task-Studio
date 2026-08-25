import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { useDeletedNotes, usePurgeNote, useRestoreNote } from '@/entities/note/model/queries';
import {
  useBinnedProjects,
  usePurgeProject,
  useRestoreProject,
} from '@/entities/project/model/queries';
import type { BinnedProject } from '@/entities/project/model/types';
import { usePurgeTask, useRecycleBin, useRestoreTask } from '@/entities/task/model/queries';
import { TASK_TYPE_META, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatDeadlineDate, formatRelative } from '@/shared/lib/dates';
import { clampText } from '@/shared/lib/text';
import { readableInk } from '@/shared/lib/colors';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  PostItGlyph,
  Segmented,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

type Bin = 'tasks' | 'notes' | 'projects';

const ROW =
  'gpu flex flex-wrap items-center gap-3 rounded-2xl border border-edge bg-surface-raised p-4';

/** Whole days between now and an expiry, floored, never negative. */
const daysUntil = (iso: string): number =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/**
 * Soft-deleted work. Nothing here is gone until it is purged, which is the
 * whole point of a recycle bin.
 *
 * Three kinds of deletable object land here: tasks binned from a board,
 * Post-its binned from the notes board, a project whiteboard or a cleared page,
 * and — since projects grew a retention window — whole projects.
 *
 * The notes half used to be a promise the UI made in a toast and never kept:
 * they were soft-deleted correctly, but nothing ever listed them again. The
 * projects half was the same promise with a bigger object behind it, and a
 * worse consequence — a binned project kept every task, page, note, message
 * and uploaded file it had, permanently, with no screen anywhere that could
 * even show it to you. Now it is listed, restorable, and destroyed on a clock.
 *
 * ## Why the projects tab looks different from the other two
 *
 * Because the decision is different. A binned task is a line you either want
 * back or do not. A binned project is forty tasks, two hundred messages and a
 * folder of uploads, and nobody can decide its fate from a name alone — so the
 * row carries what is still inside it and when the server will destroy it, and
 * the destroy button asks for a password rather than a confirmation click.
 */
const RecycleBinPage = () => {
  const t = useT();
  const [bin, setBin] = useState<Bin>('tasks');

  const { data: tasks = [], isLoading: tasksLoading } = useRecycleBin();
  const restoreTask = useRestoreTask();
  const purgeTask = usePurgeTask();

  const { data: notes = [], isLoading: notesLoading } = useDeletedNotes();
  const restoreNote = useRestoreNote();
  const purgeNote = usePurgeNote();

  const { data: projects = [], isLoading: projectsLoading } = useBinnedProjects();
  const restoreProject = useRestoreProject();
  const purgeProject = usePurgeProject();

  /**
   * The project awaiting permanent deletion, and the password for it.
   *
   * Held here rather than per row so there can only ever be one such dialog
   * open, and cleared the moment it closes — see the effect below. It is never
   * put in a mutation variable that lingers or anywhere that gets logged.
   */
  const [purgeTarget, setPurgeTarget] = useState<BinnedProject | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!purgeTarget) setPassword('');
  }, [purgeTarget]);

  if (tasksLoading && notesLoading && projectsLoading) {
    return <PageLoader label={t('bin.opening')} />;
  }

  const handlePurgeProject = async () => {
    if (!purgeTarget || password.length === 0) return;

    try {
      await purgeProject.mutateAsync({ projectId: purgeTarget.id, password });
      setPurgeTarget(null);
    } catch {
      // The mutation's `onError` has already said what went wrong. Swallowed
      // here so a rejected password leaves the dialog open to be retried
      // rather than raising an unhandled rejection.
    } finally {
      // Gone from state whatever happened.
      setPassword('');
    }
  };

  const isEmpty =
    bin === 'tasks'
      ? tasks.length === 0
      : bin === 'notes'
        ? notes.length === 0
        : projects.length === 0;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-content-faint">{t('bin.title')}</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('bin.deletedItems')}
          </h1>
        </div>

        <Segmented
          value={bin}
          onChange={setBin}
          options={[
            {
              value: 'tasks',
              label: `${t('bin.tasks')}${tasks.length > 0 ? ` (${tasks.length})` : ''}`,
              icon: <Trash2 className="h-3 w-3" />,
            },
            {
              value: 'notes',
              label: `${t('bin.notes')}${notes.length > 0 ? ` (${notes.length})` : ''}`,
              icon: <PostItGlyph className="h-3.5 w-3.5" />,
            },
            {
              value: 'projects',
              label: `${t('bin.projects')}${projects.length > 0 ? ` (${projects.length})` : ''}`,
              icon: <FolderOpen className="h-3 w-3" />,
            },
          ]}
        />
      </header>

      {isEmpty ? (
        <EmptyState
          icon={
            bin === 'tasks' ? (
              <Trash2 className="h-6 w-6" />
            ) : bin === 'notes' ? (
              <PostItGlyph className="h-6 w-6" />
            ) : (
              <FolderOpen className="h-6 w-6" />
            )
          }
          title={t(
            bin === 'tasks'
              ? 'bin.noDeletedTasks'
              : bin === 'notes'
                ? 'bin.noDeletedNotes'
                : 'bin.noDeletedProjects',
          )}
          description={t(
            bin === 'tasks'
              ? 'bin.deletedTasksBody'
              : bin === 'notes'
                ? 'bin.deletedNotesBody'
                : 'bin.deletedProjectsBody',
          )}
        />
      ) : bin === 'tasks' ? (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.li
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className={ROW}
              >
                <span
                  aria-hidden
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: task.color }}
                />

                <div className="min-w-[200px] flex-1 space-y-0.5">
                  <p className="text-sm font-medium leading-snug line-through decoration-content-faint">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-content-faint">
                    {task.project?.name ?? t('agenda.personal')} · deleted{' '}
                    {task.deletedAt ? formatRelative(task.deletedAt) : 'recently'}
                  </p>
                </div>

                {task.autoArchivedAt && (
                  <Badge
                    className="border-brand/40 bg-brand/10 text-brand"
                    // Worth calling out: nobody deleted this, and restoring it
                    // brings the task back open rather than completed.
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('bin.autoArchived')}
                  </Badge>
                )}

                <Badge
                  className={cn(
                    'border-transparent bg-transparent',
                    TASK_TYPE_META[task.type].accent,
                  )}
                >
                  {TASK_TYPE_META[task.type].label}
                </Badge>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => restoreTask.mutate(task.id)}
                    isLoading={restoreTask.isPending && restoreTask.variables === task.id}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('bin.restore')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(t('bin.confirmPurgeTask', { title: task.title }))) {
                        purgeTask.mutate(task.id);
                      }
                    }}
                    isLoading={purgeTask.isPending && purgeTask.variables === task.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : bin === 'notes' ? (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {notes.map((note) => {
              const preview = note.title?.trim() || note.content.trim();

              return (
                <motion.li
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className={ROW}
                >
                  {/* The note itself, shrunk to a chip — a binned Post-it should
                      still look like the object it was. */}
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 -rotate-3 place-items-center rounded-[3px] shadow-postit"
                    style={{ backgroundColor: note.color, color: readableInk(note.color) }}
                  >
                    {note.kind === 'IMAGE' ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <PostItGlyph className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-[200px] flex-1 space-y-0.5">
                    <p className="line-clamp-1 text-sm font-medium leading-snug">
                      {preview || <span className="italic text-content-faint">{t('bin.emptyNote')}</span>}
                    </p>
                    <p className="text-[11px] text-content-faint">
                      {note.scope === 'PROJECT'
                        ? t('bin.projectWhiteboard')
                        : note.scope === 'TASK'
                          ? t('bin.pinnedToTask')
                          : `Notes board · page ${note.pageIndex + 1}`}{' '}
                      · deleted {note.deletedAt ? formatRelative(note.deletedAt) : 'recently'}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => restoreNote.mutate(note.id)}
                      isLoading={restoreNote.isPending && restoreNote.variables === note.id}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('bin.restore')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(t('bin.confirmPurgeNote'))) {
                          purgeNote.mutate(note.id);
                        }
                      }}
                      isLoading={purgeNote.isPending && purgeNote.variables === note.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {projects.map((project) => {
              const days = project.purgeAt ? daysUntil(project.purgeAt) : null;

              return (
                <motion.li
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className={ROW}
                >
                  <span
                    aria-hidden
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />

                  <div className="min-w-[220px] flex-1 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium leading-snug">
                      {project.name}
                      {project.completedAt && (
                        <Badge className="border-transparent bg-transparent text-content-faint">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('bin.projectStillFinished')}
                        </Badge>
                      )}
                    </p>

                    {/*
                      What is still inside it.

                      A name is not enough to decide the fate of a project: the
                      question "may I destroy this" is really "how much is in
                      it", and this is the only screen that can answer it.
                    */}
                    <p className="text-[11px] text-content-faint">
                      {t('bin.projectContents', {
                        tasks: String(project.counts.tasks),
                        notes: String(project.counts.notes),
                        messages: String(project.counts.chatMessages),
                      })}
                      {' · deleted '}
                      {formatRelative(project.deletedAt)}
                    </p>
                  </div>

                  {/*
                    The clock. Amber inside a week, because that is the point at
                    which "I'll deal with it later" stops being true.
                  */}
                  {days !== null && project.purgeAt && (
                    <Badge
                      className={cn(
                        'border-transparent bg-transparent',
                        days <= 7 ? 'text-warning' : 'text-content-faint',
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                      {days === 0
                        ? t('bin.expiresToday')
                        : days <= 7
                          ? t('bin.expiresInDays', { days: String(days) })
                          : t('bin.expiresOn', { date: formatDeadlineDate(project.purgeAt) })}
                    </Badge>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => restoreProject.mutate(project.id)}
                      isLoading={
                        restoreProject.isPending && restoreProject.variables === project.id
                      }
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('bin.restore')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setPurgeTarget(project)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('bin.deleteForever')}
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {/*
        Permanent deletion, behind a password.

        A dialog rather than `window.confirm`, unlike the task and note rows
        above, and the difference is the size of what is being destroyed: a
        project is everything under it, there is no copy anywhere afterwards,
        and the API asks for the account's password for exactly that reason.
        A browser confirm cannot collect one.
      */}
      <Modal
        isOpen={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        title={t('bin.purgeProjectTitle', { name: purgeTarget?.name ?? '' })}
        flat
        footer={
          <>
            <Button variant="ghost" onClick={() => setPurgeTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => void handlePurgeProject()}
              isLoading={purgeProject.isPending}
              disabled={password.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('bin.purgeProjectAction')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-danger">{t('bin.purgeProjectBody')}</p>

          <Input
            name="purgePassword"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(clampText(event.target.value, TEXT_LIMITS.password))
            }
            maxLength={TEXT_LIMITS.password}
            label={t('bin.purgeProjectLabel')}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default RecycleBinPage;

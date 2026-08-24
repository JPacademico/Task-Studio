import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image as ImageIcon, RotateCcw, Sparkles, Trash2 } from 'lucide-react';

import { useDeletedNotes, usePurgeNote, useRestoreNote } from '@/entities/note/model/queries';
import { usePurgeTask, useRecycleBin, useRestoreTask } from '@/entities/task/model/queries';
import { TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { readableInk } from '@/shared/lib/colors';
import { Badge, Button, EmptyState, PageLoader, PostItGlyph, Segmented } from '@/shared/ui';
import { useT } from '@/shared/i18n';

type Bin = 'tasks' | 'notes';

const ROW =
  'gpu flex flex-wrap items-center gap-3 rounded-2xl border border-edge bg-surface-raised p-4';

/**
 * Soft-deleted work. Nothing here is gone until it is purged, which is the
 * whole point of a recycle bin.
 *
 * Both kinds of deletable object land here: tasks binned from a board, and
 * Post-its binned from the notes board, a project whiteboard or a cleared page.
 * The notes half used to be a promise the UI made in a toast and never kept —
 * they were soft-deleted correctly, but nothing ever listed them again.
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

  if (tasksLoading && notesLoading) return <PageLoader label={t('bin.opening')} />;

  const isEmpty = bin === 'tasks' ? tasks.length === 0 : notes.length === 0;

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
          ]}
        />
      </header>

      {isEmpty ? (
        <EmptyState
          icon={
            bin === 'tasks' ? <Trash2 className="h-6 w-6" /> : <PostItGlyph className="h-6 w-6" />
          }
          title={t(bin === 'tasks' ? 'bin.noDeletedTasks' : 'bin.noDeletedNotes')}
          description={
            bin === 'tasks'
              ? t('bin.deletedTasksBody')
              : t('bin.deletedNotesBody')
          }
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
      ) : (
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
      )}
    </div>
  );
};

export default RecycleBinPage;

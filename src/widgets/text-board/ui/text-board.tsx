import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Download,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useAdoptDocument,
  useCreateDocument,
  useDeleteDocument,
  useProjectDocument,
  useProjectDocuments,
  useProjectDocumentsRealtime,
  useUpdateDocument,
} from '@/entities/document/model/queries';
import type { ProjectDocument } from '@/entities/document/model/types';
import { DocumentByline, DocumentCreatorStamp } from '@/entities/document/ui/document-byline';
import type { Meeting } from '@/entities/meeting/model/types';
import type { Task } from '@/entities/task/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { RichTextEditor } from '@/features/rich-text/ui/rich-text-editor';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { sanitizeDocumentHtml } from '@/shared/lib/sanitize-html';
import {
  Button,
  EmptyState,
  ExpandToggle,
  ExpandableStage,
  Select,
  Skeleton,
  Spinner,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface TextBoardProps {
  /**
   * Omitted on the personal desk.
   *
   * The whole difference between the two boards is this one prop. A separate
   * component would have been two copies of an editor, a table of contents, a
   * save cycle, a download and a two-step delete — kept in step by hand — to
   * express "this one has no roster", which is a condition, not a design.
   */
  projectId?: string;
  /** The project's tasks, so a page can be attached to one of them. */
  tasks?: Task[];
  /** The project's live meetings, so a page can be one's minutes. */
  meetings?: Meeting[];
}

/**
 * What a new page can be pinned to, encoded for one `<Select>`.
 *
 * Tasks and meetings are two different anchors and the picker offers both, so
 * an id alone is ambiguous — `task:` / `meeting:` says which table it is from.
 * An empty string is the project itself, which is the default and the most
 * common answer.
 */
type AnchorValue = '' | `task:${string}` | `meeting:${string}`;

const parseAnchor = (value: AnchorValue): { taskId?: string; meetingId?: string } => {
  if (value.startsWith('task:')) return { taskId: value.slice('task:'.length) };
  if (value.startsWith('meeting:')) return { meetingId: value.slice('meeting:'.length) };
  return {};
};

/** Stable identities, so the defaults never re-trigger a memo. */
const NO_TASKS: Task[] = [];
const NO_MEETINGS: Meeting[] = [];

/** A filename that survives a download folder: no separators, no surprises. */
const toFileName = (title: string): string =>
  `${title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'document'}.html`;

/** Same treatment the title already got: strip the three characters that
    would otherwise close a tag we opened. */
const plain = (value: string): string => value.replace(/[<>&]/g, '');

/**
 * Wraps a document body in enough of a page to open on its own.
 *
 * The download is a standalone `.html` file rather than the raw fragment: a
 * fragment opens as unstyled text with no title and no character set, which is
 * not what anybody means by "download this document".
 *
 * The byline travels with it. A page that leaves the app loses every bit of
 * context the board around it was carrying, and the first question anybody asks
 * about a document in their downloads folder is who wrote it.
 */
const toDownloadableHtml = (title: string, body: string, byline: string): string =>
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${plain(title)}</title>
<style>
  body { max-width: 46rem; margin: 3rem auto; padding: 0 1.25rem;
         font: 16px/1.65 Georgia, 'Times New Roman', serif; color: #1a1a1a; }
  h1, h2, h3 { line-height: 1.25; }
  .byline { margin: -0.5rem 0 2rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd;
            font-size: 0.8rem; color: #666; }
  blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 1rem; color: #555; }
  pre { background: #f4f4f5; padding: .75rem 1rem; border-radius: 6px; overflow-x: auto; }
  img, video { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${plain(title)}</h1>
${byline ? `<p class="byline">${plain(byline)}</p>` : ''}
${body}
</body>
</html>`;

/**
 * A text board — a project's, or your own.
 *
 * A table of contents on the left, one page open on the right. Pages belong to
 * the project, to a single task inside it, or to nobody but their author, and
 * that split is the only structure here — a document tree would be a second
 * navigation system inside a tab.
 *
 * Editing is explicitly modal (read → Edit → Save) rather than always-on. This
 * is a shared surface with no operational transform behind it: two people
 * typing into the same paragraph would silently overwrite each other, and a
 * page you have to deliberately open for editing is a page you are much less
 * likely to be in by accident while a colleague is writing. The personal board
 * keeps the same cycle — not because anybody else could be typing, but because
 * "am I editing this?" should not be a question whose answer depends on which
 * board you are looking at.
 *
 * What the personal board drops is everything that only makes sense with a
 * roster: no task to pin a page to, and no attribution anywhere. A byline on a
 * desk with one person at it is a label reading "you" on everything you own.
 */
export const TextBoard = ({
  projectId,
  tasks = NO_TASKS,
  meetings = NO_MEETINGS,
}: TextBoardProps) => {
  const t = useT();
  const { data: documents = [], isLoading } = useProjectDocuments(projectId);

  /** No project, no roster — and therefore nothing to attribute or attach. */
  const isPersonal = projectId === undefined;

  // Read once here rather than inside every byline: the credit is an entity
  // component and does not get to know about the session.
  const currentUserId = useCurrentUser()?.id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [attachTo, setAttachTo] = useState<AnchorValue>('');

  // The body lives in a ref, not in state: it changes on every keystroke and
  // nothing outside the editor renders from it until a save.
  const draftRef = useRef('');

  const { data: open, isLoading: isOpening } = useProjectDocument(selectedId ?? undefined);

  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  /** Set when a teammate saves the page you have open. Cleared on reload. */
  const [remoteEdit, setRemoteEdit] = useState<ProjectDocument | null>(null);

  /*
   * A teammate's save arrives while you are reading.
   *
   * If the page is only open for reading, take it — that is what "live" means,
   * and there is nothing to lose. If it is open for *editing*, refuse to touch
   * the buffer and raise a notice instead: this board is last-write-wins by
   * design (see the note on the component), and silently replacing somebody's
   * half-written paragraph with a colleague's version is the one failure this
   * feature must not have.
   */
  const handleRemoteEdit = useCallback(
    (document: ProjectDocument) => {
      if (isEditing || isDirty) {
        setRemoteEdit(document);
        return;
      }

      setTitle(document.title);
      draftRef.current = document.content ?? '';
    },
    [isDirty, isEditing],
  );

  const adoptDocument = useAdoptDocument();

  useProjectDocumentsRealtime(projectId, {
    openDocumentId: selectedId ?? undefined,
    onRemoteEdit: handleRemoteEdit,
  });

  // Open the most recent page on arrival, so the tab is never an empty frame
  // when there is something to read.
  useEffect(() => {
    if (!selectedId && documents.length > 0) setSelectedId(documents[0].id);
  }, [documents, selectedId]);

  useEffect(() => {
    if (!open) return;
    setTitle(open.title);
    draftRef.current = open.content ?? '';
    setIsDirty(false);
    setIsEditing(false);
    setConfirmingDelete(false);
    // Whatever a colleague did to the previous page is no longer relevant.
    setRemoteEdit(null);
  }, [open]);

  const grouped = useMemo(() => {
    const general: ProjectDocument[] = [];
    const perTask: ProjectDocument[] = [];
    const perMeeting: ProjectDocument[] = [];

    for (const entry of documents) {
      if (entry.meetingId) perMeeting.push(entry);
      else if (entry.taskId) perTask.push(entry);
      else general.push(entry);
    }

    return { general, perTask, perMeeting };
  }, [documents]);

  /*
   * What a *new* page may be pinned to.
   *
   * Finished work does not take new pages, and that is a rule rather than a
   * tidiness preference — the API refuses the write either way (see
   * `assertTaskAcceptsPages`), so offering the option would be offering an
   * error. Pages already attached to something that has since finished are
   * untouched: they stay in the list, they open, and they save.
   *
   * Meetings need no equivalent filter here — the board's snapshot only ever
   * holds live ones, because a completed meeting leaves it.
   */
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'COMPLETED'),
    [tasks],
  );

  const anchorOptions = useMemo(
    () => [
      {
        value: '' as AnchorValue,
        label: t('doc.projectDocument'),
        hint: t('doc.belongsToProject'),
      },
      ...openTasks.map((task) => ({
        value: `task:${task.id}` as AnchorValue,
        label: task.title,
        swatch: task.color,
        hint: t('doc.pinnedToTask'),
      })),
      ...meetings.map((meeting) => ({
        value: `meeting:${meeting.id}` as AnchorValue,
        label: meeting.title,
        hint: `${t('doc.pinnedToMeeting')} · ${formatDateTime(meeting.startAt)}`,
      })),
    ],
    [meetings, openTasks, t],
  );

  const handleCreate = () => {
    const anchor = parseAnchor(attachTo);

    const title = anchor.taskId
      ? `Notes — ${tasks.find((task) => task.id === anchor.taskId)?.title ?? 'task'}`
      : anchor.meetingId
        ? `Minutes — ${meetings.find((entry) => entry.id === anchor.meetingId)?.title ?? 'meeting'}`
        : t('doc.untitled');

    createDocument.mutate(
      {
        projectId,
        ...anchor,
        title,
        content: '',
      },
      {
        onSuccess: (created) => {
          setSelectedId(created.id);
          setIsEditing(true);
          setAttachTo('');
          toast.success(t('doc.created'));
        },
      },
    );
  };

  const handleSave = () => {
    if (!open) return;

    updateDocument.mutate(
      {
        documentId: open.id,
        // Sanitised here as well as on the server: what gets stored should be
        // what the next reader's browser will actually be given.
        payload: { title: title.trim() || t('doc.untitled'), content: sanitizeDocumentHtml(draftRef.current) },
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          setIsEditing(false);
          toast.success(t('doc.saved'));
        },
      },
    );
  };

  const handleDownload = () => {
    if (!open) return;

    const body = sanitizeDocumentHtml(isEditing ? draftRef.current : (open.content ?? ''));

    // Nobody needs telling who wrote the page on their own desk.
    const byline =
      !isPersonal && open.createdBy
        ? `Created by ${open.createdBy.displayName} · ${formatDateTime(open.createdAt)}` +
          (open.updatedBy && open.updatedAt !== open.createdAt
            ? ` — last edited by ${open.updatedBy.displayName} · ${formatDateTime(open.updatedAt)}`
            : '')
        : '';

    const blob = new Blob([toDownloadableHtml(title, body, byline)], {
      type: 'text/html;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = toFileName(title);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!open) return;

    deleteDocument.mutate(open.id, {
      onSuccess: () => {
        setSelectedId(documents.find((entry) => entry.id !== open.id)?.id ?? null);
        setConfirmingDelete(false);
      },
    });
  };

  const DocumentRow = ({ document: entry }: { document: ProjectDocument }) => (
    <button
      type="button"
      onClick={() => {
        if (isDirty && !window.confirm(t('doc.discardChanges'))) return;
        setSelectedId(entry.id);
      }}
      className={cn(
        'w-full rounded-xl border px-2.5 py-2 text-left transition-colors duration-150',
        entry.id === selectedId
          ? 'border-brand bg-brand/[0.08]'
          : 'border-transparent hover:border-edge hover:bg-surface-sunken/60',
      )}
    >
      <span className="flex items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-content-faint" />
        <span className="truncate text-xs font-semibold">{entry.title}</span>
        {/* Whose page this is, at the size a scanned list can carry: a face,
            with the name and the date in its tooltip. Every row on a personal
            desk would carry the same face, which is not information. */}
        {!isPersonal && (
          <DocumentCreatorStamp
            createdBy={entry.createdBy}
            createdAt={entry.createdAt}
            className="ml-auto"
          />
        )}
      </span>
      <span className="mt-0.5 block truncate text-[10px] text-content-faint">
        {entry.excerpt || t('doc.emptyPage')}
      </span>
    </button>
  );

  return (
    <ExpandableStage
      isExpanded={isExpanded}
      onCollapse={() => setIsExpanded(false)}
      title={t(isPersonal ? 'doc.yourBoard' : 'doc.projectBoard')}
    >
      <div className="ui-textured flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2 sm:p-3">
        {/*
          Creating is two controls, not a dialog: where it goes, then go.

          The app's own `Select` rather than a native one. A native `<select>`
          is painted by the operating system — it ignores the radius tokens,
          the type scale, the border weight and the skin entirely, so on the
          arcade it was a rounded macOS pill in a grid of notched tiles, and on
          newsprint it was the one thing on the page with a gradient. This is
          the same listbox every filter row in the app already uses.

          There is nowhere else for a personal page to go, so on that board
          the "where" disappears and only the "go" is left.
        */}
        {!isPersonal && (
          <Select
            className="w-48"
            value={attachTo}
            onChange={setAttachTo}
            options={anchorOptions}
          />
        )}

        <Button size="sm" onClick={handleCreate} isLoading={createDocument.isPending}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
          {t('doc.new')}
        </Button>

        <span className="ml-auto flex items-center gap-1.5">
          {open && (
            <>
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} isLoading={updateDocument.isPending}>
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (isDirty && !window.confirm(t('doc.discardChanges'))) return;
                      draftRef.current = open.content ?? '';
                      setTitle(open.title);
                      setIsDirty(false);
                      setIsEditing(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t('common.cancel')}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={handleDownload} title={t('doc.downloadAsHtml')}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('doc.download')}</span>
              </Button>

              {/* Two-step rather than a confirm dialog: deleting a page is
                  reversible nowhere in this UI, and one stray click on a
                  toolbar is exactly how it would happen. */}
              <Button
                size="sm"
                variant={confirmingDelete ? 'danger' : 'ghost'}
                onClick={() => (confirmingDelete ? handleDelete() : setConfirmingDelete(true))}
                onBlur={() => setConfirmingDelete(false)}
                isLoading={deleteDocument.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmingDelete ? (
                  t('doc.confirm')
                ) : (
                  <span className="hidden sm:inline">{t('common.delete')}</span>
                )}
              </Button>
            </>
          )}

          <ExpandToggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((expanded) => !expanded)}
            label={isExpanded ? 'Shrink' : 'Expand'}
          />
        </span>
      </div>

      <div
        className={cn(
          'grid min-h-0 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]',
          isExpanded ? 'flex-1' : 'h-[62dvh]',
        )}
      >
        {/* --- Table of contents ------------------------------------------- */}
        <aside className="scrollbar-thin hidden min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-edge bg-surface-raised p-2 lg:flex">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          )}

          {!isLoading && documents.length === 0 && (
            <p className="px-2 py-6 text-center text-xs leading-relaxed text-content-faint">
              {t('doc.noPages')}
            </p>
          )}

          {grouped.general.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t(isPersonal ? 'doc.pages' : 'doc.project')}
              </p>
              {grouped.general.map((entry) => (
                <DocumentRow key={entry.id} document={entry} />
              ))}
            </div>
          )}

          {grouped.perTask.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t('doc.tasks')}
              </p>
              {grouped.perTask.map((entry) => (
                <DocumentRow key={entry.id} document={entry} />
              ))}
            </div>
          )}

          {grouped.perMeeting.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t('doc.meetings')}
              </p>
              {grouped.perMeeting.map((entry) => (
                <DocumentRow key={entry.id} document={entry} />
              ))}
            </div>
          )}
        </aside>

        {/* --- The page ---------------------------------------------------- */}
        <section className="flex min-h-0 flex-col">
          {!selectedId || (!open && !isOpening) ? (
            <EmptyState
              className="flex-1"
              icon={<FileText className="h-6 w-6" />}
              title={t('doc.nothingOpen')}
              description={
                isPersonal
                  ? t('doc.nothingOpenPersonal')
                  : t('doc.nothingOpenProject')
              }
            />
          ) : isOpening || !open ? (
            <div className="grid flex-1 place-items-center">
              <Spinner />
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={open.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-0 flex-1 flex-col gap-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {isEditing ? (
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setIsDirty(true);
                      }}
                      maxLength={160}
                      aria-label={t('doc.documentTitle')}
                      className="field h-9 flex-1 text-sm font-semibold"
                    />
                  ) : (
                    <h3 className="flex-1 truncate text-base font-semibold tracking-tight">
                      {open.title}
                    </h3>
                  )}

                  {open.task && (
                    <span
                      className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[10px] text-content-muted"
                      title={`Attached to ${open.task.title}`}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: open.task.color }}
                      />
                      <span className="max-w-[10rem] truncate">{open.task.title}</span>
                    </span>
                  )}

                  {/* Minutes carry the appointment they belong to, with its
                      date — the one thing that makes a page of notes findable
                      six weeks later. */}
                  {open.meeting && (
                    <span
                      className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[10px] text-content-muted"
                      title={`${open.meeting.title} · ${formatDateTime(open.meeting.startAt)}`}
                    >
                      <CalendarDays className="h-2.5 w-2.5 shrink-0 text-content-faint" />
                      <span className="max-w-[10rem] truncate">{open.meeting.title}</span>
                    </span>
                  )}

                  {/* Traceability is a shared-surface problem. On your own
                      desk the answer to "who wrote this" is never in doubt,
                      so the line becomes just the last time you touched it. */}
                  {isPersonal ? (
                    <span className="text-[10px] text-content-faint">
                      Edited {formatRelative(open.updatedAt)}
                    </span>
                  ) : (
                    <DocumentByline
                      createdBy={open.createdBy}
                      createdAt={open.createdAt}
                      updatedBy={open.updatedBy}
                      updatedAt={open.updatedAt}
                      currentUserId={currentUserId}
                    />
                  )}

                  {isDirty && (
                    <span className="text-[10px] font-medium text-warning">unsaved</span>
                  )}
                </div>

                {/*
                  Somebody else saved this page while you were writing in it.

                  Offered rather than applied. Taking it would throw away
                  whatever is in the editor, and this board has no operational
                  transform to merge the two — so the choice belongs to the
                  person whose words are at stake. Reloading is one click; the
                  notice sits there until it is taken or the page is closed.
                */}
                {remoteEdit && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
                    <span className="text-[11px] text-content-muted">
                      {remoteEdit.updatedBy?.displayName ?? t('doc.someone')} saved this page while you
                      were editing. Your changes are still here.
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => {
                        // Writing it into the cache is what actually swaps the
                        // page: `open` changes, the effect above resets the
                        // local state from it, and the editor remounts because
                        // its key carries `updatedAt`.
                        adoptDocument(remoteEdit);
                      }}
                    >
                      {t('doc.loadTheirVersion')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoteEdit(null)}>
                      {t('doc.keepMine')}
                    </Button>
                  </div>
                )}

                <RichTextEditor
                  /*
                    Keyed on the saved revision, not just the id.

                    The editor deliberately syncs its surface only when
                    `documentId` changes (see the note there) — `initialHtml`
                    changing is ignored, because it changes identity on every
                    render. That is right while you are typing and wrong the
                    moment the underlying page is genuinely replaced: after a
                    save, or after adopting a teammate's version. Putting
                    `updatedAt` in the key makes "a new stored revision" mean "a
                    new editing surface", which is exactly the intent.
                  */
                  key={`${open.id}-${open.updatedAt}`}
                  className="min-h-0 flex-1"
                  documentId={open.id}
                  initialHtml={open.content ?? ''}
                  readOnly={!isEditing}
                  onChange={(html) => {
                    draftRef.current = html;
                    // Any edit counts. Comparing against the loaded body on
                    // every keystroke would mean parsing two documents per
                    // character to win back the "typed it and undid it" case,
                    // which nobody is waiting on.
                    if (!isDirty) setIsDirty(true);
                  }}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </ExpandableStage>
  );
};

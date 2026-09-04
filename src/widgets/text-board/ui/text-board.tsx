import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Eye,
  FileArchive,
  FileText,
  FileWarning,
  ImageIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { MAX_PLAIN_TEXT_CHARS, plainTextToHtml } from '@/entities/document/lib/plain-text';
import {
  useAdoptDocument,
  useCreateDocument,
  useCreateFigmaPage,
  useDeleteDocument,
  useImportDocument,
  useProjectDocument,
  useProjectDocuments,
  useProjectDocumentsRealtime,
  useUpdateDocument,
} from '@/entities/document/model/queries';
import type {
  DocumentBroadcast,
  FigmaBrief,
  ProjectDocument,
} from '@/entities/document/model/types';
import { DocumentByline, DocumentCreatorStamp } from '@/entities/document/ui/document-byline';
import type { Meeting } from '@/entities/meeting/model/types';
import type { RosterMember } from '@/entities/project/model/types';
import type { Task } from '@/entities/task/model/types';
import type { ProjectFigma } from '@/entities/project/model/types';
import {
  IMPORT_ACCEPT,
  IMPORT_MIME_TYPES,
  ImportRejection,
  classifyImportFile,
  uploadImportFile,
} from '@/entities/user/api/user.api';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { RichTextEditor } from '@/features/rich-text/ui/rich-text-editor';
import { errorMessage } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { sanitizeDocumentHtml } from '@/shared/lib/sanitize-html';
import {
  Button,
  EmptyState,
  ExpandToggle,
  ExpandableStage,
  FigmaMark,
  Select,
  Skeleton,
  Spinner,
  formatFileSize,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { DocumentAccessDialog } from './document-access-dialog';
import { DocumentDownloadMenu } from './download-menu';
import { FigmaDocument } from './figma-document';
import { ImportedDocument, formatBadge } from './imported-document';

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
  /**
   * The project's roster, so a page's author can hand the pen to some of it.
   *
   * Only used by the access dialog. Absent on the personal desk, where there is
   * nobody to hand anything to.
   */
  roster?: RosterMember[];
  /**
   * A page to open on arrival, from `?doc=` in the URL.
   *
   * How a task sheet's "open on the text board" button lands somewhere useful
   * rather than on whatever page happened to be most recently edited.
   */
  initialDocumentId?: string;
  /**
   * The design file this project is connected to, if any.
   *
   * Only used to decide whether the **Figma** button is worth drawing and what
   * its tooltip says. The page's own Figma data comes from the document, not
   * from here: a board can hold designs from several files, and this is the
   * default one rather than the only one.
   */
  figma?: ProjectFigma | null;
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

/**
 * The three characters that would otherwise open a tag nobody wrote.
 *
 * Used only where model output is composed into HTML for a saved brief. The
 * sanitiser runs over the result as well — every body on this board goes
 * through it, here and on the API — so this is the belt rather than the
 * braces: it keeps a frame called `<script>` from becoming markup at all,
 * instead of relying on the sanitiser to strip it afterwards.
 */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Stable identities, so the defaults never re-trigger a memo. */
const NO_TASKS: Task[] = [];
const NO_MEETINGS: Meeting[] = [];
const NO_ROSTER: RosterMember[] = [];

/**
 * The glyph a row in the table of contents gets.
 *
 * Four kinds of page now share one list, and a column of identical document
 * icons is a column that says nothing. The mime is what decides it, because
 * the mime is what decides how the page *behaves* when it is opened — a
 * picture zooms, an archive lists, a design syncs.
 */
const rowGlyph = (entry: ProjectDocument) => {
  if (entry.figma) return <FigmaMark className="h-3 w-2 shrink-0" />;

  const mime = entry.source?.mime ?? '';
  if (mime.startsWith('image/')) {
    return <ImageIcon aria-hidden className="h-3 w-3 shrink-0 text-content-faint" />;
  }
  if (mime === 'application/zip') {
    return <FileArchive aria-hidden className="h-3 w-3 shrink-0 text-content-faint" />;
  }

  return <FileText aria-hidden className="h-3 w-3 shrink-0 text-content-faint" />;
};

/**
 * The title an imported file starts life with.
 *
 * `Q3 report.docx` → `Q3 report`. The extension is on the badge beside the
 * name already; repeating it in the heading is the file manager's habit, not a
 * document's.
 */
const titleFromFileName = (fileName: string): string =>
  clampText(fileName.replace(/\.[a-z0-9]+$/i, '').trim(), TEXT_LIMITS.documentTitle);

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
  roster = NO_ROSTER,
  initialDocumentId,
  figma = null,
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
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  /**
   * Held here rather than on the mutation, because an import is two requests.
   *
   * The upload to storage happens first and is not a mutation at all; the row
   * is only registered once the bytes are there. A spinner tied to
   * `importDocument.isPending` would therefore appear *after* the slow half
   * had already finished.
   */
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Whether a file is currently over the board, and what is wrong with it.
   *
   * `null` is "nothing is being dragged". A string is the refusal to show on
   * the overlay — decided from the drag itself, before the pointer is
   * released, which is the whole reason this is state rather than a check
   * inside `onDrop`. Telling somebody their file is the wrong kind *after*
   * they have let go of it is a toast; telling them while they are still
   * holding it is an answer.
   */
  const [dropState, setDropState] = useState<{ isRejected: boolean; message: string } | null>(
    null,
  );

  /*
   * Depth, because `dragenter` and `dragleave` fire for every child element.
   *
   * Dragging across the overlay's own text fires `dragleave` on the container
   * and `dragenter` on the child, in that order — so a boolean flag flickers
   * the overlay off and on again for the whole time the pointer is inside.
   * Counting enters and leaves is the standard fix and the only one that
   * survives a nested layout.
   */
  const dragDepth = useRef(0);

  // The body lives in a ref, not in state: it changes on every keystroke and
  // nothing outside the editor renders from it until a save.
  const draftRef = useRef('');

  /**
   * "Open the editor as soon as this page arrives."
   *
   * Creating a blank page means it, and it was losing the race against the
   * effect below, which resets `isEditing` every time `open` changes identity.
   * Creating a page therefore dropped the user on a read-only blank sheet:
   * `setIsEditing(true)` ran, the fetched document then landed, and the effect
   * turned it straight back off.
   *
   * A ref rather than more state because it must survive that render without
   * causing one, and because the effect has to be able to *consume* it — the
   * intent applies to the next page that arrives and to no page after it.
   */
  const openForEditingRef = useRef(false);

  /**
   * The revision of the page currently held, so the socket can recognise it.
   *
   * `updatedAt` changes on every save, which makes it the identity of a
   * version. See `handleRemoteEdit` for the echo it exists to swallow.
   */
  const openRevisionRef = useRef<string | null>(null);

  const { data: open, isLoading: isOpening } = useProjectDocument(selectedId ?? undefined);

  const createDocument = useCreateDocument();
  const createFigmaPage = useCreateFigmaPage();
  const importDocument = useImportDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  /** Set when a teammate saves the page you have open. Cleared on reload. */
  const [remoteEdit, setRemoteEdit] = useState<DocumentBroadcast | null>(null);

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
    (document: DocumentBroadcast) => {
      /*
       * Your own save, coming back off the socket.
       *
       * The API emits into the whole project room, the writer included, so
       * every save returns to the person who made it. The cache already holds
       * that exact revision by then — the mutation wrote it from the response
       * — so an event carrying the same `updatedAt` says nothing new, and
       * treating it as a teammate's edit raised the "somebody saved this page
       * while you were editing" notice against yourself.
       */
      if (document.updatedAt === openRevisionRef.current) return;

      if (isEditing || isDirty) {
        setRemoteEdit(document);
        return;
      }

      setTitle(document.title);
      draftRef.current = document.content ?? '';
      openRevisionRef.current = document.updatedAt;
    },
    [isDirty, isEditing],
  );

  const adoptDocument = useAdoptDocument();

  useProjectDocumentsRealtime(projectId, {
    openDocumentId: selectedId ?? undefined,
    onRemoteEdit: handleRemoteEdit,
  });

  /*
   * A page named in the URL wins over "the most recent one".
   *
   * Keyed on `initialDocumentId` alone, so arriving from a task sheet opens
   * that page — and so does arriving from a *different* task sheet a minute
   * later, which is the case a `!selectedId` guard would silently swallow.
   * Nothing fires on a plain visit, where the effect below picks the top row.
   */
  useEffect(() => {
    if (initialDocumentId) setSelectedId(initialDocumentId);
  }, [initialDocumentId]);

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
    openRevisionRef.current = open.updatedAt;
    // Normally closes the editor — a different page is a different document.
    // Unless the action that brought this page here asked for it open; see
    // `openForEditingRef`. Consumed, so it applies once.
    setIsEditing(openForEditingRef.current);
    openForEditingRef.current = false;
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
          // Not `setIsEditing(true)` — the page has not been fetched yet, and
          // the effect that runs when it lands would close the editor again.
          openForEditingRef.current = true;
          setAttachTo('');
          toast.success(t('doc.created'));
        },
      },
    );
  };

  const handleSave = () => {
    if (!open) return;

    // Sanitised here as well as on the server: what gets stored should be what
    // the next reader's browser will actually be given.
    const content = sanitizeDocumentHtml(draftRef.current);

    /*
     * Refused locally rather than 400'd remotely.
     *
     * The API caps a body at the same number, so an oversized page fails
     * either way — but failing here keeps the draft in the editor and says
     * what is wrong, instead of losing a round trip to a validation error that
     * names a field rather than a paragraph. In practice this only ever fires
     * on a paste of something that is not prose.
     */
    if (content.length > TEXT_LIMITS.documentContent) {
      toast.error(t('doc.tooLong'));
      return;
    }

    updateDocument.mutate(
      {
        documentId: open.id,
        payload: { title: title.trim() || t('doc.untitled'), content },
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

  /**
   * Brings a document somebody already has onto the board.
   *
   * Two steps and one spinner. The bytes go straight to storage through a
   * presigned PUT — the API never carries them, exactly as for a task
   * attachment — and only then is the row registered against the object key.
   *
   * A `.txt` is turned into paragraphs here and arrives as an ordinary
   * editable page: there is no judgement in that split, so there is no reason
   * to spend a round trip on it. A PDF or a `.docx` arrives with no body at
   * all and simply *is* the uploaded file — this board shows it, hands it back
   * and never rewrites it.
   */
  /**
   * A refused file, in the reader's own language.
   *
   * `ImportRejection` carries a code rather than a sentence precisely so this
   * can exist — see the class on the API module. Everything else falls through
   * to the generic message, which is what a failed upload or a rejected import
   * arrives as.
   */
  const rejectionMessage = useCallback(
    (error: unknown): string => {
      if (!(error instanceof ImportRejection)) return errorMessage(error, t('doc.importFailed'));

      if (error.reason === 'empty') return t('doc.dropRejectedEmpty');
      if (error.reason === 'tooLarge') {
        return t('doc.dropRejectedSize', {
          limit: formatFileSize(error.limitBytes ?? 0),
        });
      }

      return t('doc.dropRejectedType');
    },
    [t],
  );

  const handleImport = async (file: File) => {
    /*
     * Refused before the spinner rather than inside it.
     *
     * The upload would refuse the same file a moment later with the same rule
     * — `uploadImportFile` calls the same classifier — but doing it here means
     * a wrong file never puts the toolbar into a loading state it is about to
     * come straight back out of.
     */
    const classified = classifyImportFile(file);
    if ('rejection' in classified) {
      toast.error(rejectionMessage(classified.rejection));
      return;
    }

    setIsImporting(true);

    try {
      const uploaded = await uploadImportFile(file);

      const content =
        uploaded.mime === 'text/plain'
          ? plainTextToHtml((await file.text()).slice(0, MAX_PLAIN_TEXT_CHARS))
          : undefined;

      const created = await importDocument.mutateAsync({
        projectId,
        ...parseAnchor(attachTo),
        title: titleFromFileName(uploaded.name) || t('doc.untitled'),
        sourceKey: uploaded.key,
        sourceUrl: uploaded.publicUrl,
        sourceName: uploaded.name,
        // The *stored* type, which for a picture is not the one that was
        // picked: `uploadImportFile` re-encodes to WebP on the way.
        sourceMime: uploaded.mime,
        sourceSize: uploaded.size,
        content,
      });

      // Deliberately *not* `openForEditingRef`: an import opens as the file
      // that was uploaded, which for a PDF or a `.docx` is all it will ever
      // be. A `.txt` arrives with a body and can be opened for reading first.
      setSelectedId(created.id);
      setAttachTo('');

      /*
       * A picture says what the optimisation bought; everything else just
       * says it arrived.
       *
       * The re-encode changes somebody's file — its size, its format and its
       * extension — and a change to somebody's file made on their behalf
       * should be visible at the moment it happens rather than discovered in
       * a downloads folder later. Only worth saying when it actually saved
       * something: a small PNG can come out marginally larger, and boasting
       * about that would be worse than silence.
       */
      const saved = uploaded.originalSize > uploaded.size * 1.1;
      toast.success(
        saved
          ? t('doc.optimised', {
              from: formatFileSize(uploaded.originalSize),
              to: formatFileSize(uploaded.size),
            })
          : t('doc.imported'),
      );
    } catch (error) {
      /*
       * One toast for all three halves.
       *
       * `classifyImportFile` refuses locally, `uploadImportFile` throws an
       * `ImportRejection` for the same rules, and `useImportDocument`
       * deliberately has no `onError` — so whichever step failed says why
       * exactly once, rather than the two-toast pile-up that a hook-level
       * handler plus a `mutateAsync` rejection produces.
       */
      toast.error(rejectionMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Putting the project's design file on the board.
   *
   * Deliberately not part of the import path above, because nothing is
   * uploaded: what is created is a page pointing at a file in Figma, read
   * through the project's own connection. It shares the anchor picker, so a
   * design belongs to the project, a task or a meeting on the same terms as
   * anything else here.
   */
  const handleAddFigmaPage = () => {
    if (!projectId) return;

    createFigmaPage.mutate(
      { projectId, ...parseAnchor(attachTo) },
      {
        onSuccess: (created) => {
          setSelectedId(created.id);
          setAttachTo('');
        },
      },
    );
  };

  /**
   * Saving the assistant's brief as a page of its own.
   *
   * An ordinary document, created through the ordinary route, with its own
   * title — never written onto the design it describes. That is the whole
   * arrangement that makes the brief safe to offer; see `FigmaBriefPanel`.
   */
  const handleSaveBrief = useCallback(
    async (brief: FigmaBrief, designTitle: string) => {
      const html = [
        `<p>${escapeHtml(brief.summary)}</p>`,
        brief.flows.length > 0 ? `<h2>${t('figma.briefFlows')}</h2>` : '',
        ...brief.flows.map(
          (flow) =>
            `<p><strong>${escapeHtml(flow.name)}</strong> — ${escapeHtml(flow.detail)}</p>`,
        ),
        brief.tasks.length > 0 ? `<h2>${t('figma.briefTasks')}</h2><ul>` : '',
        ...brief.tasks.map((task) => `<li>${escapeHtml(task)}</li>`),
        brief.tasks.length > 0 ? '</ul>' : '',
        brief.gaps.length > 0 ? `<h2>${t('figma.briefGaps')}</h2><ul>` : '',
        ...brief.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`),
        brief.gaps.length > 0 ? '</ul>' : '',
        `<p><em>${escapeHtml(t('figma.briefDisclaimer'))}</em></p>`,
      ]
        .filter(Boolean)
        .join('');

      const created = await createDocument.mutateAsync({
        projectId,
        title: clampText(`${t('figma.briefTitle')} — ${designTitle}`, TEXT_LIMITS.documentTitle),
        content: sanitizeDocumentHtml(html),
      });

      setSelectedId(created.id);
      toast.success(t('figma.briefSaved'));
    },
    [createDocument, projectId, t],
  );

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
        {rowGlyph(entry)}
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
      {/*
        An imported file's row says what it is instead of showing an excerpt.

        There is no excerpt to show — the page has no body — so every import
        would otherwise read "Empty page", which is both wrong and the exact
        opposite of what those rows are. The badge answers the question the row
        actually raises, which is why this one does not open in the editor.
      */}
      <span className="mt-0.5 flex items-center gap-1.5 text-3xs text-content-faint">
        {entry.source && !entry.source.hasBody && (
          <span className="shrink-0 rounded bg-brand/12 px-1 py-px font-semibold uppercase tracking-wide text-brand">
            {formatBadge(entry.source)}
          </span>
        )}
        <span className="truncate">
          {entry.figma
            ? t('figma.design')
            : entry.source && !entry.source.hasBody
              ? t('doc.uploadedFile')
              : entry.excerpt || t('doc.emptyPage')}
        </span>
      </span>
    </button>
  );

  /*
   * What a drag is carrying, decided from the drag rather than from the drop.
   *
   * `dataTransfer.items` is readable during `dragover`; `files` is not — the
   * browser withholds the actual `File` objects until the pointer is released,
   * which is exactly the privacy property that makes early validation
   * awkward. What *is* available is each item's `type`, and that is enough to
   * answer the only question worth answering early: is this a kind of file
   * this board takes.
   *
   * A type the OS did not recognise arrives as an empty string, and is
   * accepted here rather than refused — the drop then goes through
   * `classifyImportFile`, which falls back to the extension. Refusing on an
   * empty type would reject a `.docx` on a machine with no Office installed,
   * which is precisely the case that fallback exists for.
   */
  /**
   * Whether a drag is carrying files at all, as opposed to selected text or a
   * Post-it being moved around the app.
   *
   * `types` is one of the two things a browser will tell you about a drag
   * before it is dropped; the files themselves are deliberately withheld.
   */
  const carriesFiles = (event: ReactDragEvent): boolean =>
    Array.from(event.dataTransfer.types ?? []).includes('Files');

  const readDragKind = (
    event: ReactDragEvent,
  ): { isRejected: boolean; message: string } => {
    const items = Array.from(event.dataTransfer.items ?? []).filter(
      (item) => item.kind === 'file',
    );

    if (items.length === 0) {
      return { isRejected: true, message: t('doc.dropRejectedType') };
    }

    const first = items[0];
    const accepted =
      first.type === '' || (IMPORT_MIME_TYPES as readonly string[]).includes(first.type);

    if (!accepted) return { isRejected: true, message: t('doc.dropRejectedType') };

    return { isRejected: false, message: t('doc.dropHere') };
  };

  const endDrag = () => {
    dragDepth.current = 0;
    setDropState(null);
  };

  return (
    <ExpandableStage
      isExpanded={isExpanded}
      onCollapse={() => setIsExpanded(false)}
      title={t(isPersonal ? 'doc.yourBoard' : 'doc.projectBoard')}
    >
      {/*
        The whole board is the drop target, not a strip inside it.

        Somebody dragging a file at a Documents tab is aiming at the tab, and a
        target they have to find is a target that makes the gesture worse than
        the button it was meant to replace. The overlay only appears while a
        drag is actually over it, so the surface is unchanged the rest of the
        time.

        `onDragOver` has to call `preventDefault` on every event or the browser
        treats the drop as a navigation and opens the file in the tab —
        replacing the application with a PDF viewer, which is the one failure
        mode a drop target must not have.
      */}
      <div
        className="relative flex min-h-0 flex-1 flex-col gap-3"
        onDragEnter={(event) => {
          if (!carriesFiles(event)) return;
          dragDepth.current += 1;
          setDropState(readDragKind(event));
        }}
        onDragOver={(event) => {
          /*
           * Decided from the event, never from `dropState`.
           *
           * `dragover` fires many times a second and the first few run against
           * the render *before* `dragenter`'s state update landed — so a guard
           * on `dropState` skips `preventDefault` on exactly those, and
           * `preventDefault` is the thing that stops the browser treating the
           * drop as a navigation. Missing it means letting go of a PDF
           * replaces the whole application with a PDF viewer, which is the one
           * failure mode a drop target must not have.
           *
           * So it is called for anything carrying files, refused or not, and
           * the refusal is expressed where a refusal belongs: in the cursor
           * and on the overlay, with the drop itself turned down by a sentence.
           */
          if (!carriesFiles(event)) return;

          event.preventDefault();
          event.dataTransfer.dropEffect = dropState?.isRejected ? 'none' : 'copy';
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDropState(null);
        }}
        onDrop={(event) => {
          // Same reasoning as `onDragOver`, and it matters more here: a drop
          // that is not prevented navigates the tab to the file.
          if (!carriesFiles(event)) return;
          event.preventDefault();

          const [file, ...rest] = Array.from(event.dataTransfer.files ?? []);
          endDrag();

          if (!file) return;

          /*
           * One at a time, and said so.
           *
           * Importing is a page per file, and a drop of nine screenshots would
           * be nine pages, nine uploads and nine rows in a table of contents
           * that somebody has to tidy up. Taking the first and naming it is
           * honest about what happened; silently taking all nine is not, and
           * silently dropping eight is worse.
           */
          if (rest.length > 0) toast.info(t('doc.dropOneAtATime', { name: file.name }));

          /*
           * Not gated on `dropState.isRejected`.
           *
           * That flag is a *preview*, read from the drag's declared type
           * before the browser will hand over a `File` at all. The real file
           * is here now, and `handleImport` runs the same classifier over it
           * — which is both the authoritative answer and the one that can
           * tell "wrong kind" from "too large" and say which.
           */
          void handleImport(file);
        }}
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

        {/*
          The other way a page comes into existence.

          Beside "New" rather than behind a menu, because "start writing" and
          "I already wrote this" are the two things anybody arrives at a text
          board wanting, and they are equally common. It shares the anchor
          picker to its left: an imported page belongs to the project, a task
          or a meeting on exactly the same terms as a typed one.

          A `<label>` wrapping a hidden input rather than a button with a click
          handler — that is the only way to open a file picker without
          synthesising a click, and it keeps the control keyboard-reachable.
        */}
        <label
          className={cn(
            'ui-btn ui-btn--secondary relative inline-flex h-8 select-none items-center gap-1.5',
            'rounded-xl bg-surface-sunken px-3 text-xs text-content',
            'transition-colors duration-150 ease-studio hover:bg-edge/60',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/50',
            isImporting ? 'pointer-events-none opacity-60' : 'cursor-pointer',
          )}
          title={t('doc.importHint')}
        >
          {isImporting ? <Spinner /> : <Upload className="h-3.5 w-3.5" strokeWidth={2.4} />}
          {t(isImporting ? 'doc.importing' : 'doc.import')}
          <input
            type="file"
            accept={IMPORT_ACCEPT}
            disabled={isImporting}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              // Reset, so picking the same file twice still fires a change.
              event.target.value = '';
            }}
          />
        </label>

        {/*
          The third way a page comes into existence, and the only one that
          uploads nothing.

          Beside Import rather than behind a menu, because on a product project
          "the design" is one of the three or four things anybody arrives at
          this tab looking for. Drawn only where it can work: a personal desk
          has no project and therefore no credential, and a project that has
          not connected a file would get a button whose only outcome is an
          error naming a tab they would then have to go and find.
        */}
        {!isPersonal && figma && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddFigmaPage}
            isLoading={createFigmaPage.isPending}
            title={t('figma.addPageHint')}
          >
            <FigmaMark className="h-4 w-3" />
            {t('figma.addPage')}
          </Button>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          {open && (
            <>
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} isLoading={updateDocument.isPending}>
                    <Save className="h-3.5 w-3.5" />
                    {t('common.save')}
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
              ) : open.figma ? (
                /*
                  A design, not a page — so no Edit button either, and for a
                  reason worth spelling out differently from an upload's.

                  An uploaded file cannot be edited because this board keeps it
                  as it arrived. A design cannot be edited because the document
                  is not here at all: it is in Figma, and the only honest place
                  to change it is the application that owns it. The chip says
                  which of the two situations this is; the toolbar above the
                  design carries the way there.
                */
                <span
                  title={t('figma.addPageHint')}
                  className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-3xs text-content-muted"
                >
                  <FigmaMark className="h-3.5 w-2.5 shrink-0" />
                  {t('figma.design')}
                </span>
              ) : open.source && !open.source.hasBody ? (
                /*
                  An uploaded file, not a page — so no Edit button at all.

                  This used to be the control that handed the file to a
                  language model and replaced the page with its reading of it.
                  Removing that leaves a real question on screen ("why can I
                  not edit this one?"), and a missing button answers it worse
                  than a chip that says what the page is. Shown to everybody,
                  including a reader who could not have edited it anyway: the
                  reason is a fact about the document rather than about them,
                  and it is the more useful of the two answers.
                */
                <span
                  title={t('doc.keptAsUploadedHint')}
                  className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-3xs text-content-muted"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  {t('doc.uploadedFile')}
                </span>
              ) : open.canEdit ? (
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit')}
                </Button>
              ) : (
                /*
                  Not a disabled Edit button.

                  A greyed-out control says "you cannot do this" and leaves the
                  reader to guess why; this says whose page it is and what to do
                  about it, which is the only useful answer. See
                  `DocumentEditorGrant` on the API for the rule.
                */
                <span
                  title={t('doc.readOnlyHint', { author: open.createdBy.displayName })}
                  className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-3xs text-content-muted"
                >
                  <Eye className="h-3 w-3 shrink-0" />
                  {t('doc.readOnly')}
                </span>
              )}

              {/* Handing the pen over is the author's call, and only theirs —
                  an editor who could widen the circle would make the first
                  grant irreversible in practice. */}
              {!isPersonal && open.canManageAccess && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAccessOpen(true)}
                  title={t('doc.whoCanEdit')}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {open.editors.length > 0
                      ? t('doc.editorCount', { count: String(open.editors.length) })
                      : t('doc.shareEditing')}
                  </span>
                </Button>
              )}

              {/*
                Was one button that always produced HTML. The format is a
                choice now, and the rendering moved to the API so that all
                three agree about what a heading is — see `DownloadMenu`.

                Absent on a design, and that is not an oversight. There is no
                body to typeset and no uploaded original to hand back — the
                three formats would each produce an empty document under the
                design's own title. What somebody wants from a design is a
                *frame*, and that download is on the card the frame is drawn
                on, where the thing being downloaded can be named.
              */}
              {!open.figma && (
                <DocumentDownloadMenu
                  documentId={open.id}
                  title={title}
                  source={open.source}
                  draft={isEditing ? draftRef.current : undefined}
                />
              )}

              {/* Two-step rather than a confirm dialog: deleting a page is
                  reversible nowhere in this UI, and one stray click on a
                  toolbar is exactly how it would happen.

                  Shown only to somebody who may actually do it. The rule is not
                  `canEdit` — an admin can delete a page they cannot rewrite,
                  and a granted editor can rewrite one they cannot delete — so
                  the server answers it separately and this draws the answer.
                  Before this the button was drawn for everybody and the API
                  refused it, which is a control that exists to say no. */}
              {open.canDelete && (
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
              )}
            </>
          )}

          <ExpandToggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((expanded) => !expanded)}
            label={isExpanded ? 'Shrink' : 'Expand'}
          />
        </span>
      </div>

      {/*
        The table of contents is a list of names, not a second workspace.

        It was 240px of a 1200px pane — a fifth of the surface spent on eight
        short titles — and the document paying for it was a PDF being read
        through a browser viewer that has its own toolbar and its own margins
        inside whatever it is given. 184px still fits a two-line title without
        wrapping mid-word, and the 10dvh it hands back goes to the page.
      */}
      <div
        className={cn(
          'grid min-h-0 gap-3 lg:grid-cols-[184px_minmax(0,1fr)]',
          isExpanded ? 'flex-1' : 'h-[72dvh]',
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
              <p className="px-2 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t(isPersonal ? 'doc.pages' : 'doc.project')}
              </p>
              {grouped.general.map((entry) => (
                <DocumentRow key={entry.id} document={entry} />
              ))}
            </div>
          )}

          {grouped.perTask.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t('doc.tasks')}
              </p>
              {grouped.perTask.map((entry) => (
                <DocumentRow key={entry.id} document={entry} />
              ))}
            </div>
          )}

          {grouped.perMeeting.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
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
                        setTitle(clampText(event.target.value, TEXT_LIMITS.documentTitle));
                        setIsDirty(true);
                      }}
                      maxLength={TEXT_LIMITS.documentTitle}
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
                      className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-3xs text-content-muted"
                      title={t('common.attachedTo', { title: open.task.title })}
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
                      className="ui-chip inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-3xs text-content-muted"
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
                    <span className="text-3xs text-content-faint">
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
                    <span className="text-3xs font-medium text-warning">unsaved</span>
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
                    <span className="text-2xs text-content-muted">
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

                {open.figma ? (
                  /*
                    The page is a file in Figma, read through the project's own
                    connection.

                    Nothing here holds the design: what is stored is an address
                    and a cached reading of its structure, and the pictures are
                    rendered by Figma when somebody looks. That is why this one
                    page carries a sync button and a timestamp — it is the only
                    thing on this board that can go out of date while nobody in
                    this application has touched it.
                  */
                  <FigmaDocument
                    documentId={open.id}
                    figma={open.figma}
                    /*
                      Saving a brief is creating a page, so it is offered only
                      on a project board — a personal desk cannot hold a design
                      in the first place, and this keeps the two facts in one
                      condition rather than two.
                    */
                    onSaveBrief={
                      isPersonal
                        ? undefined
                        : (brief) => handleSaveBrief(brief, open.title)
                    }
                  />
                ) : open.source && !open.source.hasBody ? (
                  /*
                    The page is still the file that was uploaded.

                    Not an editor with the document's text poured into it, and
                    that distinction is the feature: what is on screen here is
                    the original, byte for byte, rendered by the browser's own
                    viewer. Nothing has read it, nothing has rewritten it, and
                    nothing will until somebody presses the button above.
                  */
                  <ImportedDocument
                    documentId={open.id}
                    source={open.source}
                    title={open.title}
                  />
                ) : (
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
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>

        {/*
          The overlay, and the label that is the whole feature.

          A drop target that only changes its border tells somebody *that*
          something will happen; this says *what*, and — when the file is the
          wrong kind — says so before they let go, while backing out is still
          free. The refusal names the formats rather than saying "unsupported
          file", because the reader's next action is to go and find a different
          file and the message is the only thing that tells them which.

          `pointer-events-none` matters: an overlay that swallows pointer
          events fires `dragleave` on the container underneath the instant it
          appears, which puts the whole thing into a flicker loop.
        */}
        {dropState && (
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-2xl',
              'border-2 border-dashed backdrop-blur-[2px] transition-colors duration-150',
              dropState.isRejected
                ? 'border-danger/60 bg-danger/[0.06]'
                : 'border-brand/60 bg-brand/[0.06]',
            )}
          >
            <div
              className={cn(
                'ui-card flex max-w-xs flex-col items-center gap-1.5 rounded-2xl border px-5 py-4',
                'text-center shadow-lg',
                dropState.isRejected
                  ? 'border-danger/40 bg-surface-raised'
                  : 'border-brand/40 bg-surface-raised',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-xl',
                  dropState.isRejected
                    ? 'bg-danger/12 text-danger'
                    : 'bg-brand/12 text-brand',
                )}
              >
                {dropState.isRejected ? (
                  <FileWarning className="h-4.5 w-4.5" />
                ) : (
                  <Upload className="h-4.5 w-4.5" />
                )}
              </span>

              <p className="text-sm font-semibold tracking-tight">{dropState.message}</p>
              {!dropState.isRejected && (
                <p className="text-3xs leading-relaxed text-content-muted">{t('doc.dropHint')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!isPersonal && open && open.canManageAccess && (
        <DocumentAccessDialog
          isOpen={isAccessOpen}
          onClose={() => setIsAccessOpen(false)}
          document={open}
          roster={roster}
        />
      )}
    </ExpandableStage>
  );
};

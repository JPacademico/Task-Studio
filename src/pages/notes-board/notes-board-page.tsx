import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAddBoardStroke,
  useBoard,
  useBoardPages,
  useClearBoard,
  useClearBoardStrokes,
  useCreateBoardNote,
  useCreateNoteLink,
  useDeleteBoardNote,
  useDeleteNoteLink,
  useGroupNotes,
  usePatchBoardPositions,
  useSaveBoardPositions,
  useUpdateBoardNote,
} from '@/entities/note/model/board-queries';
import type { UpdateNotePayload } from '@/entities/note/model/types';
import { PostIt, type NoteHandle } from '@/entities/note/ui/post-it';
import { uploadImage } from '@/entities/user/api/user.api';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { createPositionBus } from '@/features/notes-board/lib/position-bus';
import { groupTintFor, notesInsideRect } from '@/features/notes-board/lib/selection';
import {
  useMarqueeSelection,
  usePointerPosition,
} from '@/features/notes-board/lib/use-board-gestures';
import {
  ConnectBanner,
  LassoHint,
  MarqueeBox,
  SelectionBar,
} from '@/features/notes-board/ui/board-overlays';
import { BoardPager } from '@/features/notes-board/ui/board-pager';
import { BoardToolbar, type BoardTool } from '@/features/notes-board/ui/board-toolbar';
import { ConnectorLayer } from '@/features/notes-board/ui/connector-layer';
import { InkLayer } from '@/features/notes-board/ui/ink-layer';
import {
  BOARD_INK_COLORS,
  CONNECTOR_COLORS,
  NOTE_COLORS,
  STORAGE_KEYS,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useDebouncedCallback, useIsTouchDevice, useLocalStorage } from '@/shared/lib/hooks';
import {
  Button,
  EmptyState,
  ExpandableStage,
  PageLoader,
  RunicText,
  Segmented,
} from '@/shared/ui';
import { TextBoard } from '@/widgets/text-board/ui/text-board';
import { useT } from '@/shared/i18n';

/**
 * The two things a personal desk is made of.
 *
 * The project workspace has had both for a while — a whiteboard you arrange and
 * a text board you write on — and the personal side only ever had the first
 * one, which meant anything longer than a Post-it had to go and live inside
 * somebody's project.
 *
 * A switch rather than a second route: this is one desk seen two ways, and a
 * `/notes/text` URL would imply a second place to be.
 */
type BoardView = 'notes' | 'text';

const VIEWS: { value: BoardView; label: string; icon: React.ReactNode }[] = [
  { value: 'notes', label: 'Post-its', icon: <StickyNote className="h-3 w-3" /> },
  { value: 'text', label: 'Text board', icon: <FileText className="h-3 w-3" /> },
];

/** Keeps an image note inside a sane box whatever the source resolution is. */
const fitImage = (naturalWidth: number, naturalHeight: number) => {
  const width = Math.min(320, Math.max(140, naturalWidth));
  const scale = width / (naturalWidth || width);
  return { width: Math.round(width), height: Math.round((naturalHeight || width) * scale) + 28 };
};

/**
 * The personal Post-it board: a free canvas of draggable objects, separate from
 * project and task notes.
 *
 * Three layers stack on the same surface — ink underneath, connectors above it,
 * Post-its on top — and each one owns its own repaints. A drag writes positions
 * into the cache directly and persists them through one debounced batch request,
 * so pointer movement never round-trips through the API.
 */
const NotesBoardPage = () => {
  const t = useT();
  const isTouch = useIsTouchDevice();
  const currentUser = useCurrentUser();
  const boardRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef(new Map<string, NoteHandle>());
  // One bus per mount: connector repaints stay outside React's render path.
  const bus = useMemo(createPositionBus, []);

  const [storedPage, setStoredPage] = useLocalStorage(STORAGE_KEYS.boardPage, 0);
  const [pageIndex, setPageIndex] = useState(storedPage);
  const [view, setView] = useState<BoardView>('notes');
  const [tool, setTool] = useState<BoardTool>('select');
  const [inkColor, setInkColor] = useState<string>(BOARD_INK_COLORS[0]);
  const [inkWidth, setInkWidth] = useState(3);
  const [selection, setSelection] = useState<string[]>([]);
  const [isPickingMultiple, setIsPickingMultiple] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: board, isLoading } = useBoard(pageIndex);

  const createNote = useCreateBoardNote(pageIndex);
  const updateNote = useUpdateBoardNote(pageIndex);
  const deleteNote = useDeleteBoardNote(pageIndex);
  const savePositions = useSaveBoardPositions(pageIndex);
  const patchPositions = usePatchBoardPositions(pageIndex);
  const createLink = useCreateNoteLink(pageIndex);
  const deleteLink = useDeleteNoteLink(pageIndex);
  const addStroke = useAddBoardStroke(pageIndex);
  const clearInk = useClearBoardStrokes(pageIndex);
  const clearBoard = useClearBoard(pageIndex);
  const groupNotes = useGroupNotes(pageIndex);
  const pages = useBoardPages(pageIndex);

  const notes = useMemo(() => board?.notes ?? [], [board?.notes]);
  const links = board?.links ?? [];
  const strokes = board?.strokes ?? [];

  const persistPositions = useDebouncedCallback(
    (moves: { id: string; positionX: number; positionY: number }[]) =>
      savePositions.mutate(moves),
    350,
  );

  const registerHandle = useCallback((id: string, handle: NoteHandle | null) => {
    if (handle) handlesRef.current.set(id, handle);
    else handlesRef.current.delete(id);
  }, []);

  const goToPage = useCallback(
    (index: number) => {
      setPageIndex(index);
      setStoredPage(index);
      setSelection([]);
      setConnectFrom(null);
    },
    [setStoredPage],
  );

  // The remembered page can be gone — deleted on another device, say — which
  // would otherwise leave the pager with no active tab and a blank canvas.
  useEffect(() => {
    if (!board || board.pages.some((page) => page.index === pageIndex)) return;
    goToPage(board.pages[0]?.index ?? 0);
  }, [board, goToPage, pageIndex]);

  // --- Object creation ------------------------------------------------------

  const dropPoint = () => {
    const bounds = boardRef.current?.getBoundingClientRect();
    return {
      positionX: Math.round((bounds?.width ?? 900) / 2 - 110 + (Math.random() * 80 - 40)),
      positionY: Math.round(80 + Math.random() * 120),
    };
  };

  const handleCreateNote = () => {
    createNote.mutate({
      content: '',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      rotation: Math.round((Math.random() * 8 - 4) * 10) / 10,
      ...dropPoint(),
    });
  };

  const handleAddImage = async (file: File) => {
    setIsUploading(true);
    try {
      /*
       * One decode, not two.
       *
       * This used to race `readImageSize` against the upload, which meant the
       * file was decoded twice — once to measure it and once to send it. Now
       * that `uploadImage` downscales before sending, it already knows the
       * dimensions of what it produced, so the measurement comes back with the
       * upload for free. On a 12-megapixel phone photo that is a whole redundant
       * decode removed from the slowest device most likely to be doing this.
       *
       * The aspect ratio is unchanged by the downscale, so `fitImage` sizes the
       * note identically either way.
       */
      const uploaded = await uploadImage(file, 'notes');

      createNote.mutate({
        content: '',
        kind: 'IMAGE',
        imageKey: uploaded.key,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 60),
        rotation: Math.round((Math.random() * 5 - 2.5) * 10) / 10,
        ...fitImage(uploaded.width, uploaded.height),
        ...dropPoint(),
      });
    } catch {
      toast.error(t('editor.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  // --- Selection, grouping and connecting -----------------------------------

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (tool === 'connect') {
        if (!connectFrom) {
          setConnectFrom(id);
          return;
        }
        if (connectFrom !== id) {
          createLink.mutate({
            sourceId: connectFrom,
            targetId: id,
            style: 'ARROW',
            color: CONNECTOR_COLORS[0],
          });
        }
        setConnectFrom(null);
        return;
      }

      setSelection((current) => {
        if (!additive) return [id];
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      });
    },
    [connectFrom, createLink.mutate, tool],
  );

  /** Lasso: everything the box touches, added to or replacing the selection. */
  const commitMarquee = useCallback(
    (rect: { left: number; top: number; width: number; height: number }, additive: boolean) => {
      const hits = notesInsideRect(notes, rect);

      setSelection((current) => {
        if (!additive) return hits;
        return [...new Set([...current, ...hits])];
      });
    },
    [notes],
  );

  // The board hides its ink tools on touch; a `draw` left over from a pointer
  // session would otherwise sit selected with no button to unselect it.
  useEffect(() => {
    if (isTouch && tool === 'draw') setTool('select');
  }, [isTouch, tool]);

  const marquee = useMarqueeSelection({
    /*
     * Off on touch. A lasso is a drag across the surface, which is the exact
     * gesture the board now uses to scroll — with both live, every attempt to
     * reach a note off-screen selected everything it passed over instead. The
     * multi-select this backs is still reachable there through "Pick several",
     * which is tap-based and does not compete with anything.
     */
    enabled: tool === 'select' && !isTouch,
    surfaceRef: boardRef,
    onCommit: commitMarquee,
  });

  // The pending connector needs somewhere to point until the second click.
  const pointer = usePointerPosition(tool === 'connect' && Boolean(connectFrom), boardRef);

  const selectedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const note of notes) {
      if (selection.includes(note.id) && note.groupId) ids.add(note.groupId);
    }
    return ids;
  }, [notes, selection]);

  // Escape is the universal "stop what I am doing" on a canvas.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setConnectFrom(null);
      setSelection([]);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /** Dragging one member of a group carries the rest with it. */
  const handleGroupDrag = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
      const dragged = notes.find((note) => note.id === id);
      if (!dragged?.groupId || (deltaX === 0 && deltaY === 0)) return;

      for (const note of notes) {
        if (note.id === id || note.groupId !== dragged.groupId) continue;

        const handle = handlesRef.current.get(note.id);
        if (!handle) continue;

        // Straight onto the motion values: no React render, no dropped frames.
        const nextX = handle.x.get() + deltaX;
        const nextY = handle.y.get() + deltaY;
        handle.x.set(nextX);
        handle.y.set(nextY);
        bus.publish(note.id, nextX, nextY);
      }
    },
    [bus, notes],
  );

  const handleDragEnd = useCallback(
    (id: string, position: { positionX: number; positionY: number }) => {
      bus.release(id);

      const note = notes.find((entry) => entry.id === id);
      const moves = [{ id, ...position }];

      // Everything that travelled with the group has to be persisted too.
      if (note?.groupId) {
        for (const sibling of notes) {
          if (sibling.id === id || sibling.groupId !== note.groupId) continue;

          const handle = handlesRef.current.get(sibling.id);
          if (!handle) continue;
          moves.push({
            id: sibling.id,
            positionX: handle.x.get(),
            positionY: handle.y.get(),
          });
          bus.release(sibling.id);
        }
      }

      // Cache first so the arrows and cards agree instantly, then one batched
      // write for the whole gesture.
      patchPositions(moves);
      persistPositions(moves);
    },
    [bus, notes, patchPositions, persistPositions],
  );

  /*
   * One handler per action for the whole wall, rather than one arrow function
   * per note per render. Every board state that ticks on the pointer — the
   * draft connector in connect mode redraws on each animation frame — would
   * otherwise re-render every Post-it on the page along with it.
   */
  const handleChange = useCallback(
    (id: string, payload: UpdateNotePayload) => updateNote.mutate({ noteId: id, payload }),
    [updateNote.mutate],
  );

  const handleDelete = useCallback((id: string) => deleteNote.mutate(id), [deleteNote.mutate]);

  const handleFocus = useCallback(
    (id: string) => {
      // Bring the grabbed note to the front — but only write when it is not
      // already on top, so picking a note up is usually free.
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;

      const highest = Math.max(...notes.map((entry) => entry.zIndex));
      if (note.zIndex >= highest) return;
      updateNote.mutate({ noteId: id, payload: { zIndex: highest + 1 } });
    },
    [notes, updateNote.mutate],
  );

  if (isLoading || !board) return <PageLoader label={t('notes.opening')} />;

  const isBlank = notes.length === 0 && strokes.length === 0;
  const connectSource = connectFrom ? notes.find((note) => note.id === connectFrom) : undefined;

  // One instance, rendered either in the page header or in the full-screen bar
  // — the pager is how you move between pages and has to follow the board.
  const pager = (
    <BoardPager
      pages={board.pages}
      activeIndex={pageIndex}
      onSelect={goToPage}
      onAdd={() => pages.add.mutate()}
      onRemove={(index) => {
        pages.remove.mutate(index, {
          onSuccess: (remaining) => {
            if (index === pageIndex) goToPage(remaining[0]?.index ?? 0);
          },
        });
      }}
      onRename={(index, name) => pages.rename.mutate({ index, name })}
      isAdding={pages.add.isPending}
    />
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {!isExpanded && (
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
              <RunicText mode="always">{t('notes.title')}</RunicText>
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t(view === 'notes' ? 'notes.yourBoard' : 'doc.yourBoard')}
            </h1>
            <p className="hidden text-sm text-content-muted sm:block">
              {t(view === 'notes' ? 'notes.privateDrag' : 'notes.privateOutgrew')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={view} options={VIEWS} onChange={setView} />
            {/* The pager belongs to the wall, not to the desk. */}
            {view === 'notes' && pager}
          </div>
        </header>
      )}

      {/* One board with no project behind it: no task to pin a page to, and
          nobody to attribute one to. See `TextBoard`. */}
      {view === 'text' && <TextBoard />}

      {view === 'notes' && (
      <ExpandableStage
        isExpanded={isExpanded}
        onCollapse={() => setIsExpanded(false)}
        title="Your Post-it board"
        actions={pager}
      >
        <BoardToolbar
          tool={tool}
          onToolChange={(next) => {
            setTool(next);
            setConnectFrom(null);
            if (next !== 'select') {
              setSelection([]);
              setIsPickingMultiple(false);
            }
          }}
          inkColor={inkColor}
          onInkColorChange={setInkColor}
          inkWidth={inkWidth}
          onInkWidthChange={setInkWidth}
          isPickingMultiple={isPickingMultiple}
          onPickingMultipleChange={setIsPickingMultiple}
          onAddNote={handleCreateNote}
          onAddImage={(file) => void handleAddImage(file)}
          isUploading={isUploading}
          isAddingNote={createNote.isPending}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded((expanded) => !expanded)}
          /*
           * No ink on touch. Freehand needs the surface to swallow the drag
           * (`touch-action: none`), and the surface needs that same drag to
           * scroll to the notes that do not fit on a phone. One of the two has
           * to go, and a board you cannot navigate is worse than a board you
           * cannot doodle on.
           */
          showInkTools={!isTouch}
          onClearInk={() => clearInk.mutate()}
          onClearAll={() => {
            if (window.confirm('Clear this page? Notes move to the recycle bin.')) {
              clearBoard.mutate();
              setSelection([]);
            }
          }}
        />

      <div
        ref={boardRef}
        onPointerDown={marquee.onPointerDown}
        className={cn(
          'relative rounded-3xl border border-dashed border-edge',
          'board-grid bg-surface-sunken/40',
          /*
           * Scrollable on touch, clipped on a pointer device.
           *
           * Notes are absolutely positioned wherever they were dropped, and a
           * desk laid out on a 1400px screen puts most of them past the right
           * edge of a phone. Clipped, those notes were not merely awkward to
           * reach — there was no gesture that could reach them at all. As a
           * scroll container the same absolute positions become scrollable
           * extent, so everything is reachable with no pan/zoom layer to build
           * and nothing to change about how a note stores its position.
           *
           * `ConnectorLayer` is `overflow-visible`, so the arrows keep drawing
           * past the fold rather than being cut at the viewport edge.
           */
          isTouch ? 'overflow-auto touch-pan-x touch-pan-y' : 'overflow-hidden',
          // `dvh`: the address bar is part of the viewport `vh` counts and the
          // phone does not give back, so `58vh` ran under it.
          isExpanded ? 'min-h-0 flex-1' : 'min-h-[58dvh] sm:min-h-[66dvh]',
          tool === 'select' && !isTouch && 'cursor-crosshair',
        )}
      >
        <InkLayer
          strokes={strokes}
          isDrawing={tool === 'draw'}
          color={inkColor}
          width={inkWidth}
          onCommit={(points) => addStroke.mutate({ points, color: inkColor, width: inkWidth })}
        />

        <ConnectorLayer
          notes={notes}
          links={links}
          bus={bus}
          isConnectMode={tool === 'connect'}
          draftSourceId={connectFrom}
          pointer={pointer}
          onSelectLink={(linkId) => {
            if (tool === 'connect') deleteLink.mutate(linkId);
          }}
        />

        {isBlank ? (
          <div className="grid h-full min-h-[52dvh] place-items-center p-6">
            <EmptyState
              className="border-none"
              icon={<StickyNote className="h-6 w-6" />}
              title={t('notes.emptyDesk')}
              description={t('notes.emptyDeskBody')}
              action={
                <Button size="sm" onClick={handleCreateNote}>
                  {t('notes.addFirstNote')}
                </Button>
              }
            />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <PostIt
                key={note.id}
                note={note}
                constraintsRef={boardRef}
                isSelected={selection.includes(note.id)}
                isConnectTarget={tool === 'connect' && connectFrom !== null && connectFrom !== note.id}
                isConnectSource={connectFrom === note.id}
                isPickingMultiple={tool === 'select' && isPickingMultiple}
                groupTint={groupTintFor(note.groupId)}
                currentUserId={currentUser?.id}
                // This desk has exactly one author, so stamping every sheet
                // with their own avatar says nothing.
                showAuthor={false}
                onSelect={handleSelect}
                onRegister={registerHandle}
                onDragMove={bus.publish}
                onGroupDrag={handleGroupDrag}
                onFocus={handleFocus}
                onChange={handleChange}
                onDragEnd={handleDragEnd}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}

        <MarqueeBox rect={marquee.rect} />

        <ConnectBanner
          isActive={tool === 'connect'}
          sourceLabel={
            connectSource ? connectSource.title?.trim() || 'that note' : null
          }
          onCancel={() => {
            setConnectFrom(null);
            setTool('select');
          }}
        />

        <SelectionBar
          count={selection.length}
          canGroup={selection.length > 1}
          canUngroup={selectedGroupIds.size > 0}
          onGroup={() => {
            groupNotes.mutate({ noteIds: selection });
            setIsPickingMultiple(false);
          }}
          onUngroup={() => groupNotes.mutate({ noteIds: selection, groupId: null })}
          onClear={() => setSelection([])}
        />

        <LassoHint
          show={tool === 'select' && selection.length === 0 && notes.length > 1 && !marquee.rect}
        />
        </div>
      </ExpandableStage>
      )}
    </div>
  );
};

export default NotesBoardPage;

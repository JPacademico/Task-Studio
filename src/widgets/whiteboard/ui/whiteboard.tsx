import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, animate, type AnimationPlaybackControls } from 'framer-motion';
import {
  Eraser,
  ImagePlus,
  Link2,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { whiteboardApi } from '@/entities/chat/api/chat.api';
import type { WhiteboardElement, WhiteboardStrokeData } from '@/entities/chat/model/types';
import {
  useCreateProjectNote,
  useCreateProjectNoteLink,
  useDeleteProjectNote,
  useDeleteProjectNoteLink,
  useGroupProjectNotes,
  useRestoreProjectNote,
  usePatchProjectNotes,
  usePatchProjectPositions,
  useProjectBoard,
  useProjectBoardPages,
  useProjectBoardRealtime,
  useSaveProjectPositions,
  useUpdateProjectNote,
} from '@/entities/note/model/project-board-queries';
import { isPendingNoteId } from '@/entities/note/lib/optimistic';
import { useRoster } from '@/entities/project/model/queries';
import type { UpdateNotePayload } from '@/entities/note/model/types';
import { PostIt, type NoteHandle } from '@/entities/note/ui/post-it';
import { useCurrentUser } from '@/features/auth/model/session.store';
import {
  isFarEnough,
  quantizePoint,
  simplifyPoints,
  type InkPoint,
} from '@/features/notes-board/lib/ink-geometry';
import { createInkLayers, type InkEntry } from '@/features/notes-board/lib/ink-layers';
import { LIVE_FRAME_MS } from '@/features/notes-board/lib/live-rate';
import { peerColor } from '@/features/notes-board/lib/peer-color';
import { createPositionBus } from '@/features/notes-board/lib/position-bus';
import { useBoardHistory } from '@/features/notes-board/lib/use-board-history';
import {
  useBoardPresence,
  type RemoteStroke,
} from '@/features/notes-board/lib/use-board-presence';
import { useImageDrop } from '@/features/notes-board/lib/use-image-drop';
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
import { BoardSkeleton } from '@/features/notes-board/ui/board-skeleton';
import { ConnectorLayer } from '@/features/notes-board/ui/connector-layer';
import { PresenceCursors } from '@/features/notes-board/ui/presence-cursors';
import { queryKeys } from '@/shared/api/query-keys';
import { CONNECTOR_COLORS, NOTE_COLORS, TASK_COLORS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useDebouncedCallback, useIsTouchDevice } from '@/shared/lib/hooks';
import {
  Button,
  ColorPicker,
  ExpandToggle,
  ExpandableStage,
  NibCursor,
  NibPreview,
  PostItGlyph,
  Spinner,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface WhiteboardProps {
  projectId: string;
  canClear: boolean;
}

type Tool = 'select' | 'connect' | 'pen' | 'eraser';

const isStroke = (element: WhiteboardElement): element is WhiteboardElement & {
  data: WhiteboardStrokeData;
} => Array.isArray((element.data as WhiteboardStrokeData).points);

/** A saved element as the ink layers hold it: its id, its place in the drawing order, its ink. */
const toInkEntry = (element: WhiteboardElement & { data: WhiteboardStrokeData }): InkEntry => ({
  id: element.id,
  at: Date.parse(element.createdAt) || Date.now(),
  stroke: adoptStroke(element.data),
});

/** The width the eraser rubs at. Its own constant because two places need it. */
const ERASER_WIDTH = 26;

/**
 * The ends of the rubber's size slider.
 *
 * Named because three places have to agree on them: the input's own `min`/`max`
 * and the nib preview, which needs the range to know it cannot draw this tool
 * life-size. Left as literals, a widened slider would silently go back to
 * growing its ring out of the toolbar.
 */
const ERASER_MIN = 10;
const ERASER_MAX = 70;

/**
 * Reads a stroke saved before the eraser had a flag of its own.
 *
 * Those were written as an opaque black line at exactly the eraser's width,
 * which is a combination the pen cannot produce — its slider stops at 12 — so
 * the pair identifies an old eraser stroke without any chance of demoting
 * somebody's actual black line. Without this, every board drawn before the fix
 * would keep its black smears forever.
 */
const adoptStroke = (stroke: WhiteboardStrokeData): WhiteboardStrokeData =>
  stroke.erase === undefined &&
  stroke.width === ERASER_WIDTH &&
  /^(#000000|#000|rgba?\(0, ?0, ?0(, ?1)?\))$/.test(stroke.color)
    ? { ...stroke, erase: true }
    : stroke;

/**
 * How long after its last frame a remote drag counts as over.
 *
 * Frames arrive every `LIVE_FRAME_MS`; a gap several times that long is a
 * hand that has let go, and the next frame for the same sheet is a new
 * gesture that must start from where the sheet actually is rather than from
 * the last target of the old one.
 */
const REMOTE_DRAG_IDLE_MS = 250;

/**
 * Retries for a stroke the API turned away for arriving too fast.
 *
 * `whiteboard:draw` is metered per socket (it writes a row), and fast
 * handwriting — several short strokes a second, sustained — can outrun the
 * allowance. The acknowledgement says so, and nothing listened: the stroke
 * stayed on the author's screen and was on nobody else's, and gone after a
 * reload. The bucket refills continuously, so a short, growing wait is enough.
 */
const DRAW_RETRIES = 4;
const DRAW_RETRY_MS = 400;

/** One sheet a teammate's drag is carrying, and where its current glide is going. */
interface RemoteMotion {
  controls: AnimationPlaybackControls;
  target: { x: number; y: number };
  at: number;
}


/**
 * The project's shared canvas.
 *
 * Two surfaces on one wall. Underneath: collaborative ink, drawn imperatively
 * into two stacked canvases — committed ink below, strokes in progress above
 * (see `createInkLayers`) — with the in-progress stroke held in a ref, so
 * pointer movement never triggers a React render. On top: the same Post-it objects the
 * personal notes board uses — draggable, colourable, groupable and wired
 * together with connectors — except these belong to the project, so everybody
 * on the roster sees the same wall and every change arrives over the socket.
 *
 * Sync: a finished stroke is persisted once (`whiteboard:draw`) and peers apply
 * it as a delta; notes go through the REST API and fan out as `note:*` events.
 */
export const Whiteboard = ({ projectId, canClear }: WhiteboardProps) => {
  const t = useT();
  const isTouch = useIsTouchDevice();
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef(new Map<string, NoteHandle>());
  const bus = useMemo(createPositionBus, []);

  const { socket, isConnected } = useRealtime();
  const currentUser = useCurrentUser();

  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [width, setWidth] = useState(3);
  // The rubber has its own size, kept apart from the pen's: switching tools to
  // wipe something out and back should not have resized the nib.
  const [eraserWidth, setEraserWidth] = useState(ERASER_WIDTH);
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<string[]>([]);
  const [isPickingMultiple, setIsPickingMultiple] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  /*
   * Which page of the wall is on screen.
   *
   * The personal board's pager, on the shared wall. Local to this viewer — a
   * teammate on page 3 does not drag everybody else there — and back to the
   * first page when the project changes.
   */
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => setPageIndex(0), [projectId]);
  // Bumped by the stage whenever the surface changes host, which is the
  // moment the <canvas> below is a different element.
  const [surfaceMount, setSurfaceMount] = useState(0);

  /** Owns every pixel of ink on the wall. Plain object, not React: see `createInkLayers`. */
  const layers = useMemo(createInkLayers, []);
  useEffect(() => () => layers.dispose(), [layers]);

  const currentRef = useRef<WhiteboardStrokeData | null>(null);
  /**
   * The newest pointer sample that was too close to the last kept point to
   * keep (see `MIN_SAMPLE_GAP_PX`). Held so the stroke still ends exactly
   * where the pointer lifted, not up to a pixel and a quarter short of it.
   */
  const tailRef = useRef<InkPoint | null>(null);
  const isDrawingRef = useRef(false);
  /**
   * The stroke being drawn right now, as the room knows it.
   *
   * `id` is what lets a receiver append to the right ghost rather than
   * starting a new one on every frame, and `sent` is how many of this stroke's
   * points have already gone — so each frame broadcasts only what is new. See
   * `BoardInkDto` on the API for why re-sending the whole thing would be
   * quadratic in the stroke's own length.
   */
  const liveStrokeRef = useRef<{ id: string; sent: number } | null>(null);

  const isInking = tool === 'pen' || tool === 'eraser';

  const { data: scene = [], isLoading: isSceneLoading } = useQuery({
    queryKey: queryKeys.whiteboard.scene(projectId, pageIndex),
    queryFn: () => whiteboardApi.scene(projectId, pageIndex),
    enabled: Boolean(projectId),
  });

  // --- Post-it layer --------------------------------------------------------

  const {
    data: board,
    isLoading: isBoardLoading,
    isPlaceholderData: isBoardSwitching,
  } = useProjectBoard(projectId, pageIndex);
  useProjectBoardRealtime(projectId, pageIndex);
  const pages = useProjectBoardPages(projectId);

  /*
   * The wall is two requests — the ink scene and the Post-it snapshot — and it
   * is not a board until both have landed. Before this, neither had a loading
   * state at all: an arriving user got an empty grid with "Stick up a Post-it"
   * written in the middle of it, which is not "loading", it is the wrong answer.
   */
  const isBoardPending = isBoardLoading || isBoardSwitching || isSceneLoading;

  const notes = useMemo(() => board?.notes ?? [], [board?.notes]);

  /*
   * The notes, readable from a handler without being a dependency of it.
   *
   * This file's handlers are deliberately stable — the comment above them
   * explains why: an identity that changes re-renders every Post-it on the
   * wall, and some of this board's state ticks on the pointer. Undo needs to
   * read a note's *previous* value, which would otherwise mean depending on
   * `notes` and recreating the handler every time any note changed.
   */
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const links = board?.links ?? [];

  const createNote = useCreateProjectNote(projectId, currentUser?.id, pageIndex);
  const updateNote = useUpdateProjectNote(projectId, pageIndex);
  const deleteNote = useDeleteProjectNote(projectId, pageIndex);
  const patchPositions = usePatchProjectPositions(projectId, pageIndex);
  const patchNotes = usePatchProjectNotes(projectId, pageIndex);
  const savePositions = useSaveProjectPositions(projectId, pageIndex);
  const createLink = useCreateProjectNoteLink(projectId, pageIndex);
  const deleteLink = useDeleteProjectNoteLink(projectId, pageIndex);
  const groupNotes = useGroupProjectNotes(projectId, pageIndex);
  const restoreNote = useRestoreProjectNote(projectId, pageIndex);

  /*
   * The pages, and where this viewer is among them.
   *
   * The list rides on every page's snapshot. Until the first one lands there
   * is always at least page 0, which every project has had all along.
   */
  const boardPages = board?.pages?.length ? board.pages : [{ index: 0, name: 'Page 1' }];
  const pageLimit = board?.pageLimit ?? boardPages.length;

  const goToPage = useCallback((index: number) => {
    setPageIndex(index);
    setSelection([]);
    setConnectFrom(null);
  }, []);

  // The page on screen can be removed by an admin elsewhere; follow the wall
  // back to its first page rather than drawing a page that is gone.
  useEffect(() => {
    if (!board || isBoardSwitching || !board.pages) return;
    if (board.pages.some((page) => page.index === pageIndex)) return;
    goToPage(board.pages[0]?.index ?? 0);
  }, [board, goToPage, isBoardSwitching, pageIndex]);

  // -------------------------------------------------------------------------
  // Live collaboration
  // -------------------------------------------------------------------------

  /**
   * A teammate's drag, applied straight to the sheet's motion values.
   *
   * ## Why this bypasses React entirely
   *
   * It is the same path a *group* drag already takes (`handleGroupDrag`) and
   * for the same reason: a position that arrives sixty times a second has to
   * reach the element without a render, or one person moving one note
   * re-renders every Post-it on the wall on every frame. The motion value is
   * the element's position; writing it is one style update on one node.
   *
   * ## Why the connector bus is published to as well
   *
   * Because the arrows drawn between notes are glued to coordinates, not to
   * elements. Without this a note would slide across the board and leave every
   * connector it was part of pointing at where it used to be until the drag
   * ended — which is exactly the bug the bus was built to fix for local drags.
   *
   * ## Why a missing handle is silently ignored
   *
   * A peer can be dragging a note this client has not rendered: one still
   * arriving in the snapshot, one on a page that has since been deleted, one
   * that failed to mount. There is nothing to move and nothing to report — the
   * next full snapshot carries its real position either way.
   *
   * ## Why each frame is a glide, not a jump
   *
   * Frames arrive at `LIVE_FRAME_MS` — thirty a second — and a sheet set to
   * each one as it lands visibly steps across the board. Each frame instead
   * starts a linear tween from wherever the sheet is *now* to the new position,
   * lasting exactly one frame interval. One arriving on time takes over as the
   * last glide finishes, which reads as continuous motion; one arriving late
   * finds the sheet resting at the last target instead of mid-stutter; one
   * that never arrives costs nothing, because the next is absolute. The glide
   * still runs on the motion values, so it is still no render.
   *
   * ## Why the rest of the group moves too
   *
   * Dragging one member of a group carries the whole group on the dragger's
   * screen (`handleGroupDrag`), but only the grabbed sheet is broadcast — the
   * others are not held, and the server relays drags only for a held object.
   * So everybody else saw one sheet leave its group and the rest jump after it
   * once the drop was saved. The group is on this client too, so the same
   * delta is applied to it here, which is exactly what the dragger sees.
   */
  const remoteMotionRef = useRef(new Map<string, RemoteMotion>());

  const applyRemoteDrag = useCallback(
    (noteId: string, x: number, y: number) => {
      const handle = handlesRef.current.get(noteId);
      if (!handle) return;

      const motions = remoteMotionRef.current;
      const now = performance.now();

      /** Where a sheet's last glide was headed, or where it is if that glide is old news. */
      const origin = (id: string, fallback: { x: number; y: number }) => {
        const previous = motions.get(id);
        return previous && now - previous.at <= REMOTE_DRAG_IDLE_MS ? previous.target : fallback;
      };

      const anchor = origin(noteId, { x: handle.x.get(), y: handle.y.get() });
      const deltaX = x - anchor.x;
      const deltaY = y - anchor.y;

      const movers = [{ id: noteId, handle, to: { x, y } }];
      const groupId = notesRef.current.find((note) => note.id === noteId)?.groupId;

      if (groupId && (deltaX !== 0 || deltaY !== 0)) {
        for (const note of notesRef.current) {
          if (note.id === noteId || note.groupId !== groupId) continue;
          const sibling = handlesRef.current.get(note.id);
          if (!sibling) continue;
          const from = origin(note.id, { x: sibling.x.get(), y: sibling.y.get() });
          movers.push({ id: note.id, handle: sibling, to: { x: from.x + deltaX, y: from.y + deltaY } });
        }
      }

      const starts = movers.map((mover) => {
        motions.get(mover.id)?.controls.stop();
        return { x: mover.handle.x.get(), y: mover.handle.y.get() };
      });

      // One tween drives the whole group, so its members cannot drift apart.
      const controls = animate(0, 1, {
        duration: LIVE_FRAME_MS / 1000,
        ease: 'linear',
        onUpdate: (progress) => {
          movers.forEach((mover, index) => {
            const start = starts[index];
            const nextX = start.x + (mover.to.x - start.x) * progress;
            const nextY = start.y + (mover.to.y - start.y) * progress;
            mover.handle.x.set(nextX);
            mover.handle.y.set(nextY);
            bus.publish(mover.id, nextX, nextY);
          });
        },
      });

      for (const mover of movers) motions.set(mover.id, { controls, target: mover.to, at: now });
    },
    [bus],
  );

  /**
   * Strokes other people are part-way through, handed to the live layer.
   *
   * The layer repaints at most once per frame however many of these arrive
   * inside it; before, each incoming frame of somebody's pen repainted the
   * entire board synchronously.
   */
  const applyRemoteInk = useCallback(
    (strokes: RemoteStroke[]) => layers.setRemote(strokes),
    [layers],
  );

  const presence = useBoardPresence({
    projectId,
    pageIndex,
    onRemoteDrag: applyRemoteDrag,
    onRemoteInk: applyRemoteInk,
  });

  /*
   * Taking hold of a sheet stops any glide a teammate's last frame left
   * running on it. Their hold has ended by the time ours can be granted, but a
   * tween started by their final frame can still have a frame or two to run —
   * and it would drag the sheet back under our own pointer while it did.
   */
  const acquire = presence.acquire;
  const handleHold = useCallback(
    (noteId: string) => {
      const motion = remoteMotionRef.current.get(noteId);
      if (motion) {
        motion.controls.stop();
        remoteMotionRef.current.delete(noteId);
      }
      return acquire(noteId);
    },
    [acquire],
  );

  /*
   * Names for the pointers and the hold ribbons.
   *
   * The roster is already fetched and cached for a minute by the members tab,
   * so this is free here — and it is the only place a user id can be turned
   * into a person. A colleague whose row has not arrived yet simply has no
   * label until it does; see `PresenceCursors`.
   */
  const { data: roster } = useRoster(projectId);
  const names = useMemo(() => {
    const table: Record<string, string> = {};
    for (const member of roster ?? []) table[member.id] = member.displayName;
    return table;
  }, [roster]);

  /**
   * Who is holding a given sheet, ready for `PostIt` to draw.
   *
   * Falls back to a generic label rather than rendering nothing when the
   * roster has not landed: the *fact* that somebody has the note is the part
   * that has to be on screen immediately, because it is what explains why the
   * sheet is refusing to move. The name catches up a moment later.
   */
  /*
   * Built once per change of the lock table rather than once per note per
   * render.
   *
   * It used to be a function called inline for every sheet, returning a fresh
   * object each time — so every held sheet on the wall failed its memo check on
   * every render of the board, which in connect mode is every animation frame.
   * A table means a held sheet's `heldBy` keeps its identity until the hold
   * itself changes.
   *
   * Never this client's own holds: those are the ordinary state of a note it
   * is using, not a reason to refuse anything — see `lockedBy`.
   */
  const locks = presence.locks;
  const holds = useMemo(() => {
    const table: Record<string, { name: string; color: string }> = {};
    for (const [noteId, holder] of Object.entries(locks)) {
      if (holder === currentUser?.id) continue;
      table[noteId] = { name: names[holder] ?? t('board.someone'), color: peerColor(holder) };
    }
    return table;
  }, [currentUser?.id, locks, names, t]);

  /*
   * Ctrl+Z and Ctrl+Y for the shared wall.
   *
   * Keyed on the project, so moving between boards starts a fresh history.
   *
   * The stack only ever holds *this* client's own actions, which is the right
   * scope for a shared surface: undo reverses what you just did, never what a
   * teammate did while you were looking away. A colleague's change arriving
   * over the socket does not enter the stack and cannot be reversed by it — for
   * that there is the project changelog, which is server-side, attributed, and
   * lasts thirty days.
   */
  // Per page as well as per project: an undo must never reach back into a
  // page that is not on screen and change something the reader cannot see.
  const history = useBoardHistory(`${projectId}:${pageIndex}`);
  /*
   * Destructured, because `history` is a new object on every render while the
   * functions inside it are stable `useCallback`s. Depending on the object
   * would undo the very stability the ref above exists to preserve.
   */
  const recordHistory = history.record;

  /*
   * Positions waiting for the debounced save, merged by note.
   *
   * The debounce used to be handed each gesture's moves directly, and a
   * debounce keeps only its *last* call — so dropping one sheet and picking up
   * another inside 350ms saved the second and silently discarded the first.
   * The first sheet looked moved on this screen and was back where it started
   * on everybody else's, and on this one after a reload. Merging by id means
   * the save carries every sheet that moved since the last one went, and the
   * latest position of each.
   */
  const pendingMovesRef = useRef(new Map<string, { id: string; positionX: number; positionY: number }>());
  const saveMovesRef = useRef(savePositions.mutate);
  saveMovesRef.current = savePositions.mutate;

  const flushMoves = useCallback(() => {
    const moves = [...pendingMovesRef.current.values()];
    pendingMovesRef.current.clear();
    if (moves.length > 0) saveMovesRef.current(moves);
  }, []);

  const flushMovesDebounced = useDebouncedCallback(flushMoves, 350);

  const persistPositions = useCallback(
    (moves: { id: string; positionX: number; positionY: number }[]) => {
      for (const move of moves) pendingMovesRef.current.set(move.id, move);
      flushMovesDebounced();
    },
    [flushMovesDebounced],
  );

  // And on the way out: the debounce cancels its timer on unmount, which would
  // throw away a drop made in the last 350ms before leaving the board.
  useEffect(() => flushMoves, [flushMoves]);

  const registerHandle = useCallback((id: string, handle: NoteHandle | null) => {
    if (handle) handlesRef.current.set(id, handle);
    else handlesRef.current.delete(id);
  }, []);

  // Hydrate from the API. The layers keep the committed list themselves, so a
  // remount of the canvases (below) repaints from it without refetching.
  useEffect(() => {
    layers.setCommitted(scene.filter(isStroke).map(toInkEntry));
  }, [layers, scene]);

  // Point the layers at the canvases, then keep them sized to their container.
  //
  // Depends on `surfaceMount`: going full screen portals the surface, which
  // mounts brand-new <canvas> elements. Without re-running, the ResizeObserver
  // would still be watching the discarded ones and the new pair would never be
  // sized or painted.
  //
  // It is the stage's own remount signal rather than `isExpanded` so the
  // repaint is tied to the host actually swapping, not to the flag that asks
  // for the swap.
  useEffect(() => {
    const base = baseCanvasRef.current;
    if (!base) return;

    layers.attach(base, liveCanvasRef.current);
    const observer = new ResizeObserver(() => layers.resize());
    observer.observe(base);
    return () => observer.disconnect();
  }, [layers, surfaceMount]);

  // Peer deltas.
  const settleInk = presence.settleInk;
  useEffect(() => {
    if (!socket) return;

    const handleElement = (element: WhiteboardElement & { clientId?: string | null }) => {
      const { clientId } = element;
      if (element.projectId !== projectId || !isStroke(element)) return;
      // Somebody else's page: nothing to paint, but the ghost it replaces
      // never reached this page either.
      if ((element.pageIndex ?? 0) !== pageIndex) return;
      // Painted onto the committed layer on its own — never a full repaint.
      layers.commit(toInkEntry(element));
      // And the ghost it replaces goes in the same breath, so the stroke is
      // never on neither layer. See `settleInk`.
      settleInk(clientId);
    };

    /*
     * Strokes taken off the wall: a full clear, or somebody's undo.
     *
     * Targeted erases used to be ignored here ("re-fetched on next load"),
     * which was harmless while nothing sent one. Undo does, constantly, and a
     * teammate's Ctrl+Z has to take the stroke off everybody's board at once.
     * The payload names its project because a client can sit in several rooms.
     */
    const handleErased = (payload: {
      projectId?: string;
      pageIndex?: number;
      elementIds: string[] | null;
    }) => {
      if (payload.projectId && payload.projectId !== projectId) return;
      // A whole-page wipe names its page; an undo names strokes by id, and
      // removing an id that is not on this page is a no-op.
      if (!payload.elementIds) {
        if ((payload.pageIndex ?? 0) === pageIndex) layers.setCommitted([]);
      } else if (payload.elementIds.length > 0) {
        layers.remove({ ids: payload.elementIds });
      }
    };

    // Redo, from somebody else: their strokes come back, in drawing order.
    const handleRestored = (payload: { projectId: string; elements: WhiteboardElement[] }) => {
      if (payload.projectId !== projectId) return;
      layers.restore(
        payload.elements
          .filter((element) => (element.pageIndex ?? 0) === pageIndex)
          .filter(isStroke)
          .map(toInkEntry),
      );
    };

    socket.on('whiteboard:element', handleElement);
    socket.on('whiteboard:erased', handleErased);
    socket.on('whiteboard:restored', handleRestored);

    return () => {
      socket.off('whiteboard:element', handleElement);
      socket.off('whiteboard:erased', handleErased);
      socket.off('whiteboard:restored', handleRestored);
    };
  }, [layers, pageIndex, projectId, settleInk, socket]);

  /** Client coordinates to the normalised 0..1 space a stroke is stored in. */
  const pointFromClient = (
    rect: DOMRect,
    point: { clientX: number; clientY: number },
  ): InkPoint => {
    if (rect.width === 0 || rect.height === 0) return [0, 0];
    // Normalised 0..1 so the drawing survives different viewport sizes.
    return [(point.clientX - rect.left) / rect.width, (point.clientY - rect.top) / rect.height];
  };

  /**
   * Saves a finished stroke, and tries again if it arrived too fast.
   *
   * `clientId` is the stroke's live id: the API echoes it on the broadcast
   * element, which is how every other board knows which ghost the saved
   * stroke replaces. See `DRAW_RETRIES` for the retry.
   */
  const saveStroke = useCallback(
    (
      stroke: WhiteboardStrokeData,
      clientId: string | undefined,
      onSaved: (elementId: string) => void,
    ) => {
      const attempt = (tries: number) => {
        socket?.emit(
          'whiteboard:draw',
          {
            projectId,
            pageIndex,
            type: 'STROKE',
            data: stroke,
            ...(clientId ? { clientId } : {}),
          },
          (response?: { rateLimited?: boolean; elementId?: string | null }) => {
            if (response?.elementId) {
              onSaved(response.elementId);
              return;
            }
            if (!response?.rateLimited || tries >= DRAW_RETRIES) return;
            window.setTimeout(() => attempt(tries + 1), DRAW_RETRY_MS * (tries + 1));
          },
        );
      };
      attempt(0);
    },
    [pageIndex, projectId, socket],
  );

  /**
   * Ctrl+Z for a stroke — pen or rubber alike.
   *
   * ## Why the entry is recorded before the server has answered
   *
   * The history is a stack of what the hand did, in the order it did it; a
   * stroke that only joined the stack once its row came back would land after
   * a Post-it moved in the meantime, and Ctrl+Z would undo them out of order.
   * So the entry goes on at pointer-up, and the element id it needs to erase
   * the stroke for everybody else arrives later into `ink.id`.
   *
   * An undo that beats the acknowledgement takes the stroke off this board at
   * once and remembers it was undone; the moment the id arrives, the erase is
   * sent. A redo in the same window simply puts it back, and nothing is sent at
   * all, because as far as the room knows nothing happened.
   *
   * Undoing a rubber stroke is the same operation as undoing a pen stroke —
   * the erase stroke itself is taken off, and the ink it had rubbed out
   * reappears, exactly as it does on paper when you take back the rubbing.
   */
  const recordStroke = useCallback(
    (entry: InkEntry, clientId: string | undefined) => {
      const ink = { id: null as string | null, isUndone: false };

      saveStroke(entry.stroke, clientId, (elementId) => {
        ink.id = elementId;
        entry.id = elementId;
        if (ink.isUndone) socket?.emit('whiteboard:erase', { projectId, elementIds: [elementId] });
      });

      recordHistory({
        label: t(entry.stroke.erase ? 'board.history.erase' : 'board.history.draw'),
        undo: () => {
          ink.isUndone = true;
          layers.remove({ entry });
          if (ink.id) socket?.emit('whiteboard:erase', { projectId, elementIds: [ink.id] });
        },
        redo: () => {
          ink.isUndone = false;
          layers.restore([entry]);
          if (ink.id) socket?.emit('whiteboard:restore', { projectId, elementIds: [ink.id] });
        },
      });
    },
    [layers, projectId, recordHistory, saveStroke, socket, t],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInking) return;
    // A right-click is not a stroke, and a secondary pointer is a gesture the
    // browser is about to claim.
    if (event.button !== 0 || !event.isPrimary) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an optimisation, not a requirement — see the same guard and
      // the same reasoning in `InkLayer`. Letting it throw here aborted the
      // handler before the stroke had begun.
    }

    isDrawingRef.current = true;
    tailRef.current = null;

    const isErasing = tool === 'eraser';
    currentRef.current = {
      points: [pointFromClient(event.currentTarget.getBoundingClientRect(), event)],
      color: isErasing ? '#000' : color,
      width: isErasing ? eraserWidth : width,
      ...(isErasing ? { erase: true } : {}),
    };
    layers.setLocal(currentRef.current);

    /*
     * `crypto.randomUUID` where it exists, and a timestamp-plus-random
     * fallback where it does not.
     *
     * The id only has to be unique among the strokes in flight in one room at
     * one moment, which is a set of at most a handful — so the fallback's
     * collision odds are not a real risk, and the consequence of one would be
     * two ghosts merging for the third of a second before both are replaced by
     * their committed elements. `randomUUID` is unavailable on a page served
     * over plain HTTP, which is every developer's LAN testing setup.
     */
    liveStrokeRef.current = {
      id:
        typeof crypto?.randomUUID === 'function'
          ? crypto.randomUUID()
          : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      sent: 0,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = currentRef.current;
    if (!isDrawingRef.current || !stroke) return;

    /*
     * Every sample the browser took, not only the one it delivered.
     *
     * The same fix as `InkLayer`, for the same reason: a pointer reports far
     * faster than a frame, the browser coalesces those samples into one event,
     * and a stroke drawn from one sample per frame is a run of straight
     * segments rather than a curve. How much is thrown away is per-engine,
     * which is why a fast flick looked smooth in one browser and angular in
     * another.
     *
     * The box is measured once per event rather than once per sample — it
     * used to be one layout query for each of the dozen samples a fast mouse
     * packs into a frame.
     */
    const rect = event.currentTarget.getBoundingClientRect();
    const samples =
      typeof event.nativeEvent.getCoalescedEvents === 'function'
        ? event.nativeEvent.getCoalescedEvents()
        : [];

    /*
     * Decimated as they arrive: a sample within `MIN_SAMPLE_GAP_PX` of the
     * last kept point adds nothing the smoothing cannot draw without it, so it
     * is set aside as the tail rather than painted and broadcast. A thousand-
     * hertz mouse drawing slowly produces mostly those.
     */
    let hasNew = false;
    for (const sample of samples.length > 0 ? samples : [event]) {
      const point = pointFromClient(rect, sample);
      if (isFarEnough(stroke.points[stroke.points.length - 1], point, rect)) {
        stroke.points.push(point);
        tailRef.current = null;
        hasNew = true;
      } else {
        tailRef.current = point;
      }
    }

    if (!hasNew) return;
    layers.touchLocal();

    /*
     * Everything kept since the last event, to everybody else.
     *
     * Handed to the presence hook, which batches it into one frame per
     * `LIVE_FRAME_MS` — only the *new* points, rounded for the wire. A dropped
     * frame would be a gap in the ghost until the committed stroke replaces it
     * on pointer-up, which is why the batching exists: the old per-event
     * emits outran the server's allowance and the refusals were those gaps.
     */
    const live = liveStrokeRef.current;
    if (!live) return;

    const fresh = stroke.points.slice(live.sent).map(quantizePoint);
    live.sent = stroke.points.length;

    presence.publishInk({
      strokeId: live.id,
      points: fresh,
      color: stroke.color,
      width: stroke.width,
      erase: stroke.erase,
    });
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentRef.current;
    const live = liveStrokeRef.current;
    const tail = tailRef.current;
    currentRef.current = null;
    liveStrokeRef.current = null;
    tailRef.current = null;
    layers.setLocal(null);

    // The stroke ends where the pointer did, even if that last stretch was
    // too short to keep on the way.
    if (stroke && tail) stroke.points.push(tail);

    /*
     * Told even when the stroke is discarded, and that is the point.
     *
     * A tap that never became a line still put a ghost on everybody else's
     * board if it produced two coalesced samples. Sending `done` regardless
     * means a ghost is never orphaned by a gesture that turned out not to be a
     * stroke — the one way a live preview can leave permanent litter.
     */
    if (live) {
      presence.publishInk({
        strokeId: live.id,
        points: tail ? [quantizePoint(tail)] : [],
        color: stroke?.color ?? '#000',
        width: stroke?.width ?? 1,
        erase: stroke?.erase,
        done: true,
      });
    }

    if (!stroke || stroke.points.length < 2) return;

    /*
     * Simplified once, at the end, then rounded for storage.
     *
     * The live stroke is only decimated by distance, which is cheap enough to
     * run per sample; Ramer–Douglas–Peucker needs the whole line and removes
     * far more — every point on a straight run — so it runs here, on the
     * version that is saved, sent and painted for good. Within a fraction of a
     * pixel of what was drawn: see `SIMPLIFY_TOLERANCE_PX`.
     */
    const rect = liveCanvasRef.current?.getBoundingClientRect();
    const finished: WhiteboardStrokeData = {
      ...stroke,
      points: (rect ? simplifyPoints(stroke.points, rect) : stroke.points).map(quantizePoint),
    };

    const entry: InkEntry = { id: null, at: Date.now(), stroke: finished };
    layers.commit(entry);

    // One write per stroke — never per pointer sample — and one undo step.
    recordStroke(entry, live?.id);
  };

  const handleClear = async () => {
    try {
      await whiteboardApi.clear(projectId, pageIndex);
      layers.setCommitted([]);
      socket?.emit('whiteboard:erase', { projectId, pageIndex });
      toast.success(t('board.inkCleared'));
    } catch {
      toast.error(t('board.adminsOnlyClear'));
    }
  };

  // --- Post-it gestures -----------------------------------------------------

  const dropPoint = useCallback(() => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    return {
      positionX: Math.round((bounds?.width ?? 900) / 2 - 110 + (Math.random() * 120 - 60)),
      positionY: Math.round(70 + Math.random() * 140),
    };
  }, []);

  // Optimistic on a shared wall too — the placeholder is local to whoever
  // dropped the file, and the roster sees the real note when it is created.
  // See `useImageDrop`.
  const { addImage, isUploading } = useImageDrop({
    patchNotes,
    createNote: createNote.mutate,
    dropPoint,
    currentUserId: currentUser?.id,
  });

  const handleAddNote = () => {
    // Rolled once so a redo restores the same sheet rather than a differently
    // coloured one — see the personal board for the longer note.
    const request = {
      content: '',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      rotation: Math.round((Math.random() * 8 - 4) * 10) / 10,
      ...dropPoint(),
    };

    createNote.mutate(request, {
      // From `onSuccess`: until the POST answers there is no row id to delete.
      onSuccess: (note) =>
        history.record({
          label: t('board.history.addNote'),
          undo: () => deleteNote.mutate(note.id),
          redo: () => restoreNote.mutate(note.id),
        }),
    });
  };

  /*
   * The tool and the connect source, readable from `handleSelect` without
   * being dependencies of it — the same reason `notesRef` exists. This handler
   * used to depend on both and on the whole `history` object, which is a new
   * object every render; so it was a new function on every render of the
   * board, every Post-it's `onSelect` changed with it, and the memo on
   * `PostIt` never held. Every note on the wall re-rendered whenever anything
   * did — a lock arriving, a teammate's edit to some other note, and every
   * frame of a lasso or of a connector being aimed.
   */
  const selectStateRef = useRef({ tool, connectFrom });
  selectStateRef.current = { tool, connectFrom };

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      const { tool: activeTool, connectFrom: source } = selectStateRef.current;

      if (activeTool === 'connect') {
        if (!source) {
          setConnectFrom(id);
          return;
        }
        if (source !== id) {
          const payload = {
            sourceId: source,
            targetId: id,
            style: 'ARROW' as const,
            color: CONNECTOR_COLORS[0],
          };

          createLink.mutate(payload, {
            onSuccess: (link) =>
              recordHistory({
                label: t('board.history.connect'),
                undo: () => deleteLink.mutate(link.id),
                redo: () => createLink.mutate(payload),
              }),
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
    [createLink.mutate, deleteLink.mutate, recordHistory, t],
  );

  const commitMarquee = useCallback(
    (rect: { left: number; top: number; width: number; height: number }, additive: boolean) => {
      const hits = notesInsideRect(notesRef.current, rect);
      setSelection((current) => (additive ? [...new Set([...current, ...hits])] : hits));
    },
    [],
  );

  /*
   * An ink tool cannot survive the switch to touch.
   *
   * `TOOLS` drops pen and rubber on a coarse pointer, so a desktop session left
   * on the pen and then continued on a phone — or simply rotated into a layout
   * that reports differently — would hold a `tool` with no button to match it:
   * the strip renders nothing selected and the canvas still swallows the drag,
   * which reads as a board that has stopped scrolling for no reason.
   */
  useEffect(() => {
    if (isTouch && (tool === 'pen' || tool === 'eraser')) setTool('select');
  }, [isTouch, tool]);

  const marquee = useMarqueeSelection({
    // See the note on the notes board: a lasso and a scroll are the same drag.
    enabled: tool === 'select' && !isTouch,
    surfaceRef,
    onCommit: commitMarquee,
  });

  const pointer = usePointerPosition(tool === 'connect' && Boolean(connectFrom), surfaceRef);

  const selectedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const note of notes) {
      if (selection.includes(note.id) && note.groupId) ids.add(note.groupId);
    }
    return ids;
  }, [notes, selection]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setConnectFrom(null);
      setSelection([]);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /*
   * The gesture handlers below read `notesRef` rather than depending on
   * `notes`. Depending on it recreated them — and so re-rendered every Post-it
   * on the wall, including the one under the pointer — every time any note
   * changed anywhere, which on a shared board is every incoming `note:*` event
   * from every teammate. The note being dragged is the last one that should
   * be reconciled because somebody else edited a different sheet.
   */
  const handleGroupDrag = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
      const notes = notesRef.current;
      const dragged = notes.find((note) => note.id === id);
      if (!dragged?.groupId || (deltaX === 0 && deltaY === 0)) return;

      for (const note of notes) {
        if (note.id === id || note.groupId !== dragged.groupId) continue;

        const handle = handlesRef.current.get(note.id);
        if (!handle) continue;

        const nextX = handle.x.get() + deltaX;
        const nextY = handle.y.get() + deltaY;
        handle.x.set(nextX);
        handle.y.set(nextY);
        bus.publish(note.id, nextX, nextY);
      }
    },
    [bus],
  );

  const handleDragEnd = useCallback(
    (id: string, position: { positionX: number; positionY: number }) => {
      bus.release(id);

      // Read before `patchPositions` below: this is still the pre-drag render.
      const notes = notesRef.current;
      const note = notes.find((entry) => entry.id === id);
      const moves = [{ id, ...position }];

      if (note?.groupId) {
        for (const sibling of notes) {
          if (sibling.id === id || sibling.groupId !== note.groupId) continue;

          const handle = handlesRef.current.get(sibling.id);
          if (!handle) continue;
          moves.push({ id: sibling.id, positionX: handle.x.get(), positionY: handle.y.get() });
          bus.release(sibling.id);
        }
      }

      // Anything still uploading has no row for the batch endpoint to move.
      patchPositions(moves);

      const saveable = moves.filter((move) => !isPendingNoteId(move.id));
      if (saveable.length > 0) persistPositions(saveable);

      /*
       * Where the sheets came from, read off the last render's `notes` — which
       * still holds the pre-drag coordinates even though the cache no longer
       * does. A drag that ended where it began records nothing.
       */
      const before = saveable
        .map((move) => {
          const original = notes.find((entry) => entry.id === move.id);
          return original
            ? { id: move.id, positionX: original.positionX, positionY: original.positionY }
            : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const moved = before.some((entry, index) => {
        const after = saveable[index];
        return entry.positionX !== after.positionX || entry.positionY !== after.positionY;
      });
      if (!moved) return;

      const apply = (positions: typeof before) => {
        patchPositions(positions);
        persistPositions(positions);
      };

      recordHistory({
        label: t('board.history.move'),
        undo: () => apply(before),
        redo: () => apply(saveable),
      });
    },
    [bus, patchPositions, persistPositions, recordHistory, t],
  );

  /*
   * One handler per action for the whole wall — see the note on PostItProps.
   * The shared board redraws on every animation frame while a connector is
   * being aimed, and without these every teammate's Post-it re-rendered with
   * it.
   */
  /*
   * Every write below refuses an id the server has never heard of.
   *
   * While a picture is uploading there is a sheet on the board with no row
   * behind it (see `useImageDrop`), and it looks and behaves exactly like any
   * other — so it can be picked up, renamed or binned. Each of those would
   * PATCH or DELETE a `pending-image-…` id and come back 404, which surfaces as
   * an error toast for an action that, from the user's side, was ordinary.
   * Ignoring the write is the honest response: the note is not saveable yet,
   * and it is about to be replaced by one that is.
   */
  const handleChange = useCallback(
    (id: string, payload: UpdateNotePayload) => {
      if (isPendingNoteId(id)) return;
      updateNote.mutate({ noteId: id, payload });

      // The inverse is whatever keys the caller changed, read off the note as
      // it was — so a colour change never restores an old title.
      const previous = notesRef.current.find((entry) => entry.id === id);
      if (!previous) return;

      const inverse = Object.fromEntries(
        Object.keys(payload).map((field) => [field, previous[field as keyof typeof previous]]),
      ) as UpdateNotePayload;

      recordHistory({
        label: t('board.history.edit'),
        undo: () => updateNote.mutate({ noteId: id, payload: inverse }),
        redo: () => updateNote.mutate({ noteId: id, payload }),
      });
    },
    [recordHistory, t, updateNote.mutate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (isPendingNoteId(id)) return;
      deleteNote.mutate(id);

      // A soft delete keeps the id, so restoring it keeps every connector a
      // teammate had drawn to this note. See `useRestoreProjectNote`.
      recordHistory({
        label: t('board.history.delete'),
        undo: () => restoreNote.mutate(id),
        redo: () => deleteNote.mutate(id),
      });
    },
    [deleteNote.mutate, recordHistory, restoreNote.mutate, t],
  );

  const handleFocus = useCallback(
    (id: string) => {
      if (isPendingNoteId(id)) return;

      const notes = notesRef.current;
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;

      const highest = Math.max(...notes.map((entry) => entry.zIndex));
      if (note.zIndex >= highest) return;
      updateNote.mutate({ noteId: id, payload: { zIndex: highest + 1 } });
    },
    [updateNote.mutate],
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const connectSource = connectFrom ? notes.find((note) => note.id === connectFrom) : undefined;

  const TOOLS: { value: Tool; label: string; icon: typeof MousePointer2; hint: string }[] = [
    {
      value: 'select',
      label: t('board.arrange'),
      icon: MousePointer2,
      hint: t('board.arrangeHint'),
    },
    { value: 'connect', label: t('board.connect'), icon: Link2, hint: t('board.connectHint') },
    /*
     * Pen and rubber only where a drag can mean "draw".
     *
     * On touch the surface needs that drag to scroll to the notes that do not
     * fit on a phone, and `touch-action: none` on the canvas would take it.
     * Arranging and connecting both survive because neither is a drag across
     * the *surface* — one drags a note, the other is two taps.
     */
    ...(isTouch
      ? []
      : [
          { value: 'pen' as Tool, label: t('board.pen'), icon: Pencil, hint: t('board.penHint') },
          {
            value: 'eraser' as Tool,
            label: t('board.eraser'),
            icon: Eraser,
            hint: t('board.eraserHint'),
          },
        ]),
  ];

  return (
    <ExpandableStage
      onSurfaceRemount={() => setSurfaceMount((count) => count + 1)}
      isExpanded={isExpanded}
      onCollapse={() => setIsExpanded(false)}
      title={t('board.projectWhiteboard')}
      /*
       * The skin's decorative cursor stays off the whole board. Here the
       * pointer is a tool — crosshair for the pen, cell for the rubber, a grab
       * hand on a sheet, a resize arrow on its corner — and the skin was
       * repainting it on every press and every hover, so it changed shape
       * constantly while somebody drew. See `[data-native-cursor]`.
       */
      nativeCursor
    >
      {/*
        The wall's pages. Inside the stage rather than above it, so it follows
        the board into full screen — the pager is how you move around a wall.
        Removing a page bins every teammate's Post-its on it, so only an admin
        is offered that; the ceiling is the project owner's plan.
      */}
      <BoardPager
        pages={boardPages}
        activeIndex={pageIndex}
        onSelect={goToPage}
        onAdd={() =>
          pages.add.mutate(undefined, {
            onSuccess: (payload) => {
              const added = payload.pages.find(
                (page) => !boardPages.some((existing) => existing.index === page.index),
              );
              if (added) goToPage(added.index);
            },
          })
        }
        onRemove={(index) => pages.remove.mutate(index)}
        onRename={(index, name) => pages.rename.mutate({ index, name })}
        isAdding={pages.add.isPending}
        max={pageLimit}
        canRemove={canClear}
        fullLabel={t('board.projectPagesFull', { max: String(pageLimit) })}
      />

      <div className="ui-textured flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2 sm:gap-3 sm:p-3">
        <div className="ui-segment inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1">
          {TOOLS.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              title={hint}
              aria-pressed={tool === value}
              onClick={() => {
                setTool(value);
                setConnectFrom(null);
                if (value !== 'select') {
                  setSelection([]);
                  setIsPickingMultiple(false);
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                tool === value
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'text-content-muted hover:text-content',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <span className="hidden h-6 w-px bg-edge sm:block" />

        {/* Same Post-it affordances as the personal board, pending state
            included — which is to say, none. See `BoardToolbar`. */}
        <Button
          size="sm"
          onClick={handleAddNote}
          title={t('board.addPostItTitle')}
          aria-label={t('board.addPostIt')}
          className="px-2.5"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
          <PostItGlyph className="h-[1.125rem] w-[1.125rem]" />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          title={t('board.pinImage')}
        >
          {isUploading ? (
            <Spinner />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t('board.image')}</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addImage(file);
            event.target.value = '';
          }}
        />

        {/*
          Undo and redo, next to the tools that create the things they reverse.

          The keyboard is the real interface — Ctrl+Z is what a hand reaches for
          without being told — but a shortcut nobody can see is one most people
          never discover. These two are the signpost, and they cost a thumb's
          width. Disabled rather than hidden when the stack is empty, so nothing
          beside them shifts and the greyed state answers "is there anything to
          undo?" on its own.
        */}
        <span className="flex items-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={history.undo}
            disabled={!history.canUndo}
            aria-label={t('board.undo')}
            title={`${t('board.undo')} (Ctrl+Z)`}
            className="px-2"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={history.redo}
            disabled={!history.canRedo}
            aria-label={t('board.redo')}
            title={`${t('board.redo')} (Ctrl+Y)`}
            className="px-2"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </span>

        {tool === 'select' && (
          <button
            type="button"
            onClick={() => setIsPickingMultiple((value) => !value)}
            aria-pressed={isPickingMultiple}
            title={t('board.pickSeveralTitle')}
            className={cn(
              'ui-filter inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors',
              isPickingMultiple
                ? 'border-brand bg-brand/15 text-brand'
                : 'border-edge text-content-muted hover:border-brand/40 hover:text-content',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('board.pickSeveral')}</span>
          </button>
        )}

        {/* Ink options only while a pen is actually in hand. */}
        {tool === 'pen' && (
          <>
            <span className="hidden h-6 w-px bg-edge sm:block" />
            <ColorPicker value={color} onChange={setColor} options={TASK_COLORS.slice(0, 6)} />
            <label className="flex items-center gap-2 text-xs text-content-muted">
              {t('board.inkSize')}
              <input
                type="range"
                min={1}
                max={12}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
                className="w-20 accent-brand"
              />
              <NibPreview size={width} color={color} />
            </label>
          </>
        )}

        {/* A rubber has a size too, and it is the only thing about it worth
            setting — there is nothing to choose a colour for. */}
        {tool === 'eraser' && (
          <>
            <span className="hidden h-6 w-px bg-edge sm:block" />
            <label className="flex items-center gap-2 text-xs text-content-muted">
              {t('board.eraserNib')}
              <input
                type="range"
                min={ERASER_MIN}
                max={ERASER_MAX}
                step={2}
                value={eraserWidth}
                onChange={(event) => setEraserWidth(Number(event.target.value))}
                className="w-20 accent-brand"
              />
              {/* No colour: a rubber has none, and the ring says so by being
                  drawn in the interface's own ink rather than in anybody's.

                  The slider's ends are handed over because this is the one
                  control in the app whose range is wider than the preview box:
                  a 70px ring drawn life-size grew straight out of the toolbar.
                  Given the range, the ring is scaled to fit it instead — see
                  `ringDiameter`. The rubber's true size is still shown, on the
                  canvas, by `NibCursor`. */}
              <NibPreview size={eraserWidth} min={ERASER_MIN} max={ERASER_MAX} />
            </label>
          </>
        )}

        <span
          className={cn(
            'ml-auto text-2xs',
            isConnected ? 'text-positive' : 'text-content-faint',
          )}
        >
          {t(isConnected ? 'board.liveWithTeam' : 'board.offlineLocal')}
        </span>

        <ExpandToggle
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((expanded) => !expanded)}
          label={isExpanded ? 'Shrink' : 'Expand'}
        />

        {canClear && (
          <Button size="sm" variant="ghost" onClick={() => void handleClear()}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('board.clearInk')}
          </Button>
        )}
      </div>

      <div
        ref={surfaceRef}
        onPointerDown={marquee.onPointerDown}
        className={cn(
          'relative rounded-2xl border border-edge bg-surface-raised',
          'board-grid',
          // Scrollable on touch so notes dropped off a phone's edge stay
          // reachable — see the longer note on the notes board.
          isTouch ? 'overflow-auto touch-pan-x touch-pan-y' : 'overflow-hidden',
          /*
           * Raised from 62dvh, matching the personal desk.
           *
           * A wall people pin things to is worth more the more of it there is,
           * and the two boards should not disagree about how much room that
           * deserves — the same gesture on the same kind of surface.
           */
          isExpanded ? 'min-h-0 flex-1' : 'h-[76dvh]',
          tool === 'select' && !isTouch && 'cursor-crosshair',
        )}
      >
        {/*
          The ink, in two layers — see `createInkLayers`.

          Committed ink below, never touching the pointer. Strokes in progress
          above it, on the canvas that takes the pointer while a pen is out;
          otherwise the Post-its and the lasso underneath would never see an
          event. Both share one position and one z-order, so the pair sits
          exactly where the single canvas used to.
        */}
        <canvas
          ref={baseCanvasRef}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full',
            isInking && 'z-20',
          )}
        />
        <canvas
          ref={liveCanvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          // A cancelled pointer — the OS claiming a pen for a gesture, a palm
          // rejected — ends the stroke too, rather than leaving it drawing.
          onPointerCancel={handlePointerUp}
          // touch-none stops the browser from scrolling while drawing on mobile.
          className={cn(
            'absolute inset-0 h-full w-full',
            isInking ? 'z-20 touch-none' : 'pointer-events-none',
            // A rubber is not a nib: the pointer should say which one is in
            // hand before the first stroke rather than after it. The ring below
            // says how *big* it is; the cursor says which of the two it is.
            tool === 'pen' && 'cursor-crosshair',
            tool === 'eraser' && 'cursor-cell',
          )}
        />

        {/* The nib itself, at the size it will mark or rub at. */}
        <NibCursor
          surface={surfaceRef}
          size={tool === 'eraser' ? eraserWidth : width}
          color={tool === 'eraser' ? undefined : color}
          isActive={isInking && !isTouch}
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

        <AnimatePresence initial={false}>
          {notes.map((note) => (
            <PostIt
              // Keyed on `clientKey` where there is one: a sheet drawn
              // optimistically keeps the same element when the server's row
              // takes its place, so a drag in progress is never torn out from
              // under the pointer. See `Note.clientKey`.
              key={note.clientKey ?? note.id}
              note={note}
              constraintsRef={surfaceRef}
              isSelected={selection.includes(note.id)}
              isConnectTarget={tool === 'connect' && connectFrom !== null && connectFrom !== note.id}
              isConnectSource={connectFrom === note.id}
              isPickingMultiple={tool === 'select' && isPickingMultiple}
              groupTint={groupTintFor(note.groupId)}
              // A shared wall: anybody may rearrange, only the author may bin.
              canDelete={note.userId === currentUser?.id}
              currentUserId={currentUser?.id}
              canResize
              /*
               * The three props that make this wall safe for two hands.
               *
               * `heldBy` is somebody *else's* grip — drawn as a ring and a
               * name, and refusing every gesture. `onHold`/`onRelease` are
               * how this client takes and gives back its own. See
               * `useBoardPresence`.
               */
              heldBy={holds[note.id] ?? null}
              onHold={handleHold}
              onRelease={presence.release}
              onDragBroadcast={presence.publishDrag}
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

        {isBoardPending && <BoardSkeleton />}

        {!isBoardPending && notes.length === 0 && !isInking && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <PostItGlyph className="h-8 w-8 text-content-faint" />
              <p className="text-sm font-semibold">{t('board.sharedWall')}</p>
              <p className="max-w-xs text-xs leading-relaxed text-content-muted">
                {t('board.sharedWallBody')}
              </p>
            </div>
          </div>
        )}

        {/*
          Everybody else's pointer.

          Last among the layers and on `z-30`, because a pointer is the one
          thing that is *in front of* the paper rather than on it — and it is
          `pointer-events-none`, so it is never between a reader and a note.
        */}
        <PresenceCursors
          projectId={projectId}
          pageIndex={pageIndex}
          surfaceRef={surfaceRef}
          names={names}
        />

        <MarqueeBox rect={marquee.rect} />

        <ConnectBanner
          isActive={tool === 'connect'}
          sourceLabel={connectSource ? connectSource.title?.trim() || 'that note' : null}
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
            // Each note's own previous group, so undoing never dissolves a
            // group the user did not touch. See the personal board.
            const before = notes
              .filter((note) => selection.includes(note.id))
              .map((note) => ({ id: note.id, groupId: note.groupId }));

            groupNotes.mutate({ noteIds: selection });
            setIsPickingMultiple(false);

            history.record({
              label: t('board.history.group'),
              undo: () => {
                for (const entry of before) {
                  groupNotes.mutate({ noteIds: [entry.id], groupId: entry.groupId });
                }
              },
              redo: () => groupNotes.mutate({ noteIds: selection }),
            });
          }}
          onUngroup={() => {
            const before = notes
              .filter((note) => selection.includes(note.id))
              .map((note) => ({ id: note.id, groupId: note.groupId }));

            groupNotes.mutate({ noteIds: selection, groupId: null });

            history.record({
              label: t('board.history.group'),
              undo: () => {
                for (const entry of before) {
                  groupNotes.mutate({ noteIds: [entry.id], groupId: entry.groupId });
                }
              },
              redo: () => groupNotes.mutate({ noteIds: selection, groupId: null }),
            });
          }}
          onClear={() => setSelection([])}
        />

        <LassoHint
          show={tool === 'select' && selection.length === 0 && notes.length > 1 && !marquee.rect}
        />
      </div>
    </ExpandableStage>
  );
};

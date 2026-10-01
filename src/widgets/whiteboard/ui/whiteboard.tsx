import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { documentApi } from '@/entities/document/api/document.api';
import type { FolderFiling } from '@/entities/document/model/types';
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
import type { Note, UpdateNotePayload } from '@/entities/note/model/types';
import { uploadImage } from '@/entities/user/api/user.api';
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
import { BoardFullDialog } from '@/features/notes-board/ui/board-full-dialog';
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
 * The ends of the rubber's size slider. Named because three places have to agree on them: the
 * input's own `min`/`max` and the nib preview.
 */
const ERASER_MIN = 10;
const ERASER_MAX = 70;

/**
 * Reads a stroke saved before the eraser had a flag of its own. Those were written as an opaque
 * black line at exactly the eraser's width, which is a combination the pen cannot produce.
 */
const adoptStroke = (stroke: WhiteboardStrokeData): WhiteboardStrokeData =>
  stroke.erase === undefined &&
  stroke.width === ERASER_WIDTH &&
  /^(#000000|#000|rgba?\(0, ?0, ?0(, ?1)?\))$/.test(stroke.color)
    ? { ...stroke, erase: true }
    : stroke;

/**
 * How long after its last frame a remote drag counts as over. Frames arrive every `LIVE_FRAME_MS`;
 * a gap several times that long is a hand that has let go.
 */
const REMOTE_DRAG_IDLE_MS = 250;

/**
 * Retries for a stroke the API turned away for arriving too fast. `whiteboard:draw` is metered per
 * socket (it writes a row), and fast handwriting — several short strokes a second, sustained.
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
 * The project's shared canvas. Two surfaces on one wall. Underneath: collaborative ink, drawn
 * imperatively into two stacked canvases — committed ink below, strokes in progress above.
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
  // Which page of the wall is on screen. The personal board's pager, on the shared wall. Local to
  // this viewer — a teammate on page 3 does not drag everybody else there.
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
   * The newest pointer sample that was too close to the last kept point to keep (see
   * `MIN_SAMPLE_GAP_PX`).
   */
  const tailRef = useRef<InkPoint | null>(null);
  const isDrawingRef = useRef(false);
  /**
   * The stroke being drawn right now, as the room knows it. `id` is what lets a receiver append to
   * the right ghost rather than starting a new one on every frame.
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

  // The wall is two requests — the ink scene and the Post-it snapshot — and it is not a board until
  // both have landed.
  const isBoardPending = isBoardLoading || isBoardSwitching || isSceneLoading;

  const notes = useMemo(() => board?.notes ?? [], [board?.notes]);

  // The notes, readable from a handler without being a dependency of it. This file's handlers are
  // deliberately stable — the comment above them explains why.
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

  // The pages, and where this viewer is among them. The list rides on every page's snapshot. Until
  // the first one lands there is always at least page 0, which every project has had all along.
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

  // --- Live collaboration ------------------------------------------------------

  /**
   * A teammate's drag, applied straight to the sheet's motion values. It is the same path a *group*
   * drag already takes (`handleGroupDrag`) and for the same reason.
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
   * Strokes other people are part-way through, handed to the live layer. The layer repaints at most
   * once per frame however many of these arrive inside it; before.
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

  // Taking hold of a sheet stops any glide a teammate's last frame left running on it. Their hold
  // has ended by the time ours can be granted.
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

  // Names for the pointers and the hold ribbons. The roster is already fetched and cached for a
  // minute by the members tab, so this is free here.
  const { data: roster } = useRoster(projectId);
  const names = useMemo(() => {
    const table: Record<string, string> = {};
    for (const member of roster ?? []) table[member.id] = member.displayName;
    return table;
  }, [roster]);

  /**
   * Who is holding a given sheet, ready for `PostIt` to draw. Falls back to a generic label rather
   * than rendering nothing when the roster has not landed.
   */
  // Built once per change of the lock table rather than once per note per render. It used to be a
  // function called inline for every sheet, returning a fresh object each time.
  const locks = presence.locks;
  const holds = useMemo(() => {
    const table: Record<string, { name: string; color: string }> = {};
    for (const [noteId, holder] of Object.entries(locks)) {
      if (holder === currentUser?.id) continue;
      table[noteId] = { name: names[holder] ?? t('board.someone'), color: peerColor(holder) };
    }
    return table;
  }, [currentUser?.id, locks, names, t]);

  // Ctrl+Z and Ctrl+Y for the shared wall. Keyed on the project, so moving between boards starts a
  // fresh history.
  const history = useBoardHistory(`${projectId}:${pageIndex}`);
  // Destructured, because `history` is a new object on every render while the functions inside it
  // are stable `useCallback`s.
  const recordHistory = history.record;

  // Positions waiting for the debounced save, merged by note. The debounce used to be handed each
  // gesture's moves directly, and a debounce keeps only its *last* call.
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

  // Point the layers at the canvases, then keep them sized to their container. Depends on
  // `surfaceMount`: going full screen portals the surface.
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

    // Strokes taken off the wall: a full clear, or somebody's undo. Targeted erases used to be
    // ignored here ("re-fetched on next load"), which was harmless while nothing sent one.
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
   * Saves a finished stroke, and tries again if it arrived too fast. `clientId` is the stroke's
   * live id: the API echoes it on the broadcast element, which is how every other board knows.
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

  /** Ctrl+Z for a stroke — pen or rubber alike. The history is a stack of what the hand did. */
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
      // Capture is an optimisation, not a requirement — see the same guard and the same reasoning
      // in `InkLayer`. Letting it throw here aborted the handler before the stroke had begun.
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

    // `crypto.randomUUID` where it exists, and a timestamp-plus-random fallback where it does not.
    // The id only has to be unique among the strokes in flight in one room at one moment.
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

    // Every sample the browser took, not only the one it delivered. The same fix as `InkLayer`, for
    // the same reason: a pointer reports far faster than a frame.
    const rect = event.currentTarget.getBoundingClientRect();
    const samples =
      typeof event.nativeEvent.getCoalescedEvents === 'function'
        ? event.nativeEvent.getCoalescedEvents()
        : [];

    // Decimated as they arrive.
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

    // Everything kept since the last event, to everybody else. Handed to the presence hook, which
    // batches it into one frame per `LIVE_FRAME_MS` — only the *new* points, rounded for the wire.
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

    // Told even when the stroke is discarded, and that is the point. A tap that never became a line
    // still put a ghost on everybody else's board if it produced two coalesced samples.
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

    // Simplified once, at the end, then rounded for storage. The live stroke is only decimated by
    // distance, which is cheap enough to run per sample.
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

  /** The wall as drawn, so a dropped picture is fitted inside it. */
  const boardSize = useCallback(() => {
    const element = surfaceRef.current;
    return element ? { width: element.clientWidth, height: element.clientHeight } : null;
  }, []);

  // Every picture pinned here is also filed on the project's Documents board, by the API, in a
  // folder named after this page — see `BoardFoldersService`.
  const queryClient = useQueryClient();
  const [fullFiling, setFullFiling] = useState<Extract<FolderFiling, { status: 'full' }> | null>(
    null,
  );
  /** Folders already announced this session, so a toast is news, not noise. */
  const announcedFolders = useRef(new Set<string>());

  const uploadToWall = useCallback(
    (file: File) =>
      uploadImage(file, 'notes', {
        reuse: (md5) => documentApi.lookupBoardAsset(projectId, md5),
      }),
    [projectId],
  );

  const handlePictureFiled = useCallback(
    (note: Note) => {
      const filing = note.folder;
      if (!filing) return;

      if (filing.status === 'full') {
        setFullFiling(filing);
        return;
      }
      if (filing.status === 'skipped') return;

      void queryClient.invalidateQueries({ queryKey: ['documents', 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.usage(projectId) });

      // Said once per folder per session: the first picture is when somebody
      // needs to learn this happens; the twentieth is when they do not.
      if (filing.status === 'saved' && !announcedFolders.current.has(filing.documentId)) {
        announcedFolders.current.add(filing.documentId);
        toast.success(t('folder.filed', { title: filing.title }));
      }
    },
    [projectId, queryClient, t],
  );

  // Optimistic on a shared wall too — the placeholder is local to whoever dropped the file, and the
  // roster sees the real note when it is created.
  const { addImage, isUploading } = useImageDrop({
    patchNotes,
    createNote: createNote.mutateAsync,
    dropPoint,
    boardSize,
    currentUserId: currentUser?.id,
    upload: uploadToWall,
    onCreated: handlePictureFiled,
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

  // The tool and the connect source, readable from `handleSelect` without being dependencies of it
  // — the same reason `notesRef` exists.
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

  // An ink tool cannot survive the switch to touch. `TOOLS` drops pen and rubber on a coarse
  // pointer, so a desktop session left on the pen and then continued on a phone.
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

  // The gesture handlers below read `notesRef` rather than depending on `notes`. Depending on it
  // recreated them — and so re-rendered every Post-it on the wall.
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

      // Where the sheets came from, read off the last render's `notes` — which still holds the
      // pre-drag coordinates even though the cache no longer does.
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

  // One handler per action for the whole wall — see the note on PostItProps. The shared board
  // redraws on every animation frame while a connector is being aimed.
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
    // Pen and rubber only where a drag can mean "draw". On touch the surface needs that drag to
    // scroll to the notes that do not fit on a phone.
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
      /* The skin's decorative cursor stays off the whole board. Here the pointer is a tool —
         crosshair for the pen, cell for the rubber, a grab hand on a sheet. */
      nativeCursor
    >
      {/* The wall's pages. Inside the stage rather than above it, so it follows the board into
          full screen — the pager is how you move around a wall. */}
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

        {/* Undo and redo, next to the tools that create the things they reverse. The keyboard
            is the real interface — Ctrl+Z is what a hand reaches for without being told. */}
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
              {/* No colour: a rubber has none, and the ring says so by being drawn in the
                  interface's own ink rather than in anybody's. */}
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
          /* Raised from 62dvh, matching the personal desk. */
          isExpanded ? 'min-h-0 flex-1' : 'h-[76dvh]',
          tool === 'select' && !isTouch && 'cursor-crosshair',
        )}
      >
        {/* The ink, in two layers — see `createInkLayers`. */}
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
            // A rubber is not a nib: the pointer should say which one is in hand before the first
            // stroke rather than after it.
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
              // Keyed on `clientKey` where there is one: a sheet drawn optimistically keeps the
              // same element when the server's row takes its place.
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
              /* The three props that make this wall safe for two hands. `heldBy` is somebody
                 *else's* grip — drawn as a ring and a name, and refusing every gesture. */
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

        {/* Everybody else's pointer. */}
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

      <BoardFullDialog
        projectId={projectId}
        filing={fullFiling}
        onClose={() => setFullFiling(null)}
      />
    </ExpandableStage>
  );
};

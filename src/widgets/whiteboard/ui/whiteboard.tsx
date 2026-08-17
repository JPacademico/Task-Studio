import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import {
  Eraser,
  ImagePlus,
  Link2,
  MousePointer2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { whiteboardApi } from '@/entities/chat/api/chat.api';
import type { WhiteboardElement, WhiteboardStrokeData } from '@/entities/chat/model/types';
import {
  useCreateProjectNote,
  useCreateProjectNoteLink,
  useDeleteProjectNote,
  useDeleteProjectNoteLink,
  useGroupProjectNotes,
  usePatchProjectPositions,
  useProjectBoard,
  useProjectBoardRealtime,
  useSaveProjectPositions,
  useUpdateProjectNote,
} from '@/entities/note/model/project-board-queries';
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
import { ConnectorLayer } from '@/features/notes-board/ui/connector-layer';
import { queryKeys } from '@/shared/api/query-keys';
import { CONNECTOR_COLORS, NOTE_COLORS, TASK_COLORS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useDebouncedCallback } from '@/shared/lib/hooks';
import { Button, ColorPicker, ExpandToggle, ExpandableStage, PostItGlyph, Spinner } from '@/shared/ui';

interface WhiteboardProps {
  projectId: string;
  canClear: boolean;
}

type Tool = 'select' | 'connect' | 'pen' | 'eraser';

const isStroke = (element: WhiteboardElement): element is WhiteboardElement & {
  data: WhiteboardStrokeData;
} => Array.isArray((element.data as WhiteboardStrokeData).points);

/** The width the eraser rubs at. Its own constant because two places need it. */
const ERASER_WIDTH = 26;

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

/** Keeps an image note inside a sane box whatever the source resolution is. */
const fitImage = (naturalWidth: number, naturalHeight: number) => {
  const width = Math.min(320, Math.max(140, naturalWidth));
  const scale = width / (naturalWidth || width);
  return {
    width: Math.round(width),
    height: Math.round((naturalHeight || width) * scale) + 28,
  };
};


/**
 * The project's shared canvas.
 *
 * Two surfaces on one wall. Underneath: collaborative ink, drawn imperatively
 * into a single <canvas> with the in-progress stroke held in a ref, so pointer
 * movement never triggers a React render. On top: the same Post-it objects the
 * personal notes board uses — draggable, colourable, groupable and wired
 * together with connectors — except these belong to the project, so everybody
 * on the roster sees the same wall and every change arrives over the socket.
 *
 * Sync: a finished stroke is persisted once (`whiteboard:draw`) and peers apply
 * it as a delta; notes go through the REST API and fan out as `note:*` events.
 */
export const Whiteboard = ({ projectId, canClear }: WhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Bumped by the stage whenever the surface changes host, which is the
  // moment the <canvas> below is a different element.
  const [surfaceMount, setSurfaceMount] = useState(0);

  const strokesRef = useRef<WhiteboardStrokeData[]>([]);
  const currentRef = useRef<WhiteboardStrokeData | null>(null);
  const isDrawingRef = useRef(false);

  const isInking = tool === 'pen' || tool === 'eraser';

  const { data: scene = [] } = useQuery({
    queryKey: queryKeys.whiteboard.scene(projectId),
    queryFn: () => whiteboardApi.scene(projectId),
    enabled: Boolean(projectId),
  });

  // --- Post-it layer --------------------------------------------------------

  const { data: board } = useProjectBoard(projectId);
  useProjectBoardRealtime(projectId);

  const notes = useMemo(() => board?.notes ?? [], [board?.notes]);
  const links = board?.links ?? [];

  const createNote = useCreateProjectNote(projectId);
  const updateNote = useUpdateProjectNote(projectId);
  const deleteNote = useDeleteProjectNote(projectId);
  const patchPositions = usePatchProjectPositions(projectId);
  const savePositions = useSaveProjectPositions(projectId);
  const createLink = useCreateProjectNoteLink(projectId);
  const deleteLink = useDeleteProjectNoteLink(projectId);
  const groupNotes = useGroupProjectNotes(projectId);

  const persistPositions = useDebouncedCallback(
    (moves: { id: string; positionX: number; positionY: number }[]) =>
      savePositions.mutate(moves),
    350,
  );

  const registerHandle = useCallback((id: string, handle: NoteHandle | null) => {
    if (handle) handlesRef.current.set(id, handle);
    else handlesRef.current.delete(id);
  }, []);

  /**
   * Repaints the whole scene. Cheap: strokes are plain point arrays.
   *
   * Erasing is `destination-out` rather than a stroke in the background colour:
   * the canvas is transparent and sits over the board's own grid, its notes and
   * whatever the active skin paints behind them, so "the background colour" is
   * not a colour this component knows — and painting one would have punched an
   * opaque hole in the wall instead of rubbing ink off it.
   *
   * Because the whole scene is repainted in order every frame, an eraser stroke
   * only ever removes the ink laid down before it, which is what makes it
   * behave like a rubber rather than like a hole in the canvas.
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const paint = (stroke: WhiteboardStrokeData) => {
      if (stroke.points.length < 2) return;

      context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
      context.beginPath();
      // Any opaque colour erases; the alpha is what does the work.
      context.strokeStyle = stroke.erase ? '#000' : stroke.color;
      context.lineWidth = stroke.width;
      context.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height);

      for (const [px, py] of stroke.points.slice(1)) {
        context.lineTo(px * canvas.width, py * canvas.height);
      }
      context.stroke();
    };

    strokesRef.current.forEach(paint);
    if (currentRef.current) paint(currentRef.current);

    // Never leave the context in erase mode: the next caller to touch it is
    // usually the next frame's first stroke.
    context.globalCompositeOperation = 'source-over';
  }, []);

  // Hydrate from the API, then keep the canvas sized to its container.
  //
  // Both effects depend on `surfaceMount`: going full screen portals the
  // surface, which mounts a brand-new <canvas>. Without re-running, the
  // ResizeObserver would still be watching the discarded element and the new
  // one would never be sized or painted.
  //
  // It is the stage's own remount signal rather than `isExpanded` so the
  // repaint is tied to the host actually swapping, not to the flag that asks
  // for the swap.
  useEffect(() => {
    strokesRef.current = scene.filter(isStroke).map((element) => adoptStroke(element.data));
    redraw();
  }, [redraw, scene, surfaceMount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw, surfaceMount]);

  // Peer deltas.
  useEffect(() => {
    if (!socket) return;

    const handleElement = (element: WhiteboardElement) => {
      if (element.projectId !== projectId || !isStroke(element)) return;
      strokesRef.current.push(adoptStroke(element.data));
      redraw();
    };

    const handleErased = (payload: { elementIds: string[] | null }) => {
      // A full clear wipes locally; targeted erases are re-fetched on next load.
      if (!payload.elementIds) {
        strokesRef.current = [];
        redraw();
      }
    };

    socket.on('whiteboard:element', handleElement);
    socket.on('whiteboard:erased', handleErased);

    return () => {
      socket.off('whiteboard:element', handleElement);
      socket.off('whiteboard:erased', handleErased);
    };
  }, [projectId, redraw, socket]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Normalised 0..1 so the drawing survives different viewport sizes.
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInking) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    const isErasing = tool === 'eraser';
    currentRef.current = {
      points: [pointFromEvent(event)],
      color: isErasing ? '#000' : color,
      width: isErasing ? eraserWidth : width,
      ...(isErasing ? { erase: true } : {}),
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentRef.current) return;

    currentRef.current.points.push(pointFromEvent(event));
    requestAnimationFrame(redraw);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentRef.current;
    currentRef.current = null;
    if (!stroke || stroke.points.length < 2) return;

    strokesRef.current.push(stroke);
    redraw();

    // One write per stroke — never per pointer sample.
    socket?.emit('whiteboard:draw', { projectId, type: 'STROKE', data: stroke });
  };

  const handleClear = async () => {
    try {
      await whiteboardApi.clear(projectId);
      strokesRef.current = [];
      redraw();
      socket?.emit('whiteboard:erase', { projectId });
      toast.success('Ink cleared. Post-its are untouched.');
    } catch {
      toast.error('Only project admins can clear the canvas.');
    }
  };

  // --- Post-it gestures -----------------------------------------------------

  const dropPoint = () => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    return {
      positionX: Math.round((bounds?.width ?? 900) / 2 - 110 + (Math.random() * 120 - 60)),
      positionY: Math.round(70 + Math.random() * 140),
    };
  };

  const handleAddNote = () => {
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
      // One decode: `uploadImage` downscales before sending and hands back the
      // dimensions of what it produced, so measuring the file separately would
      // be decoding the same photograph twice. See the note on the personal
      // board, which had the same pair of calls.
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
      toast.error('Could not upload that image.');
    } finally {
      setIsUploading(false);
    }
  };

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

  const commitMarquee = useCallback(
    (rect: { left: number; top: number; width: number; height: number }, additive: boolean) => {
      const hits = notesInsideRect(notes, rect);
      setSelection((current) => (additive ? [...new Set([...current, ...hits])] : hits));
    },
    [notes],
  );

  const marquee = useMarqueeSelection({
    enabled: tool === 'select',
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

  const handleGroupDrag = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
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
    [bus, notes],
  );

  const handleDragEnd = useCallback(
    (id: string, position: { positionX: number; positionY: number }) => {
      bus.release(id);

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

      patchPositions(moves);
      persistPositions(moves);
    },
    [bus, notes, patchPositions, persistPositions],
  );

  /*
   * One handler per action for the whole wall — see the note on PostItProps.
   * The shared board redraws on every animation frame while a connector is
   * being aimed, and without these every teammate's Post-it re-rendered with
   * it.
   */
  const handleChange = useCallback(
    (id: string, payload: UpdateNotePayload) => updateNote.mutate({ noteId: id, payload }),
    [updateNote.mutate],
  );

  const handleDelete = useCallback((id: string) => deleteNote.mutate(id), [deleteNote.mutate]);

  const handleFocus = useCallback(
    (id: string) => {
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;

      const highest = Math.max(...notes.map((entry) => entry.zIndex));
      if (note.zIndex >= highest) return;
      updateNote.mutate({ noteId: id, payload: { zIndex: highest + 1 } });
    },
    [notes, updateNote.mutate],
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const connectSource = connectFrom ? notes.find((note) => note.id === connectFrom) : undefined;

  const TOOLS: { value: Tool; label: string; icon: typeof MousePointer2; hint: string }[] = [
    { value: 'select', label: 'Arrange', icon: MousePointer2, hint: 'Drag notes, lasso to select' },
    { value: 'connect', label: 'Connect', icon: Link2, hint: 'Draw arrows between notes' },
    { value: 'pen', label: 'Pen', icon: Pencil, hint: 'Draw on the canvas' },
    { value: 'eraser', label: 'Eraser', icon: Eraser, hint: 'Rub ink out' },
  ];

  return (
    <ExpandableStage
      onSurfaceRemount={() => setSurfaceMount((count) => count + 1)}
      isExpanded={isExpanded}
      onCollapse={() => setIsExpanded(false)}
      title="Project whiteboard"
    >
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

        {/* Same Post-it affordances as the personal board. */}
        <Button
          size="sm"
          onClick={handleAddNote}
          isLoading={createNote.isPending}
          title="Add a Post-it for the team"
          aria-label="Add a Post-it"
          className="px-2.5"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
          <PostItGlyph className="h-[18px] w-[18px]" />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          title="Pin an image"
        >
          {isUploading ? (
            <Spinner />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Image</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleAddImage(file);
            event.target.value = '';
          }}
        />

        {tool === 'select' && (
          <button
            type="button"
            onClick={() => setIsPickingMultiple((value) => !value)}
            aria-pressed={isPickingMultiple}
            title="Click several notes in a row to select them together"
            className={cn(
              'ui-filter inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors',
              isPickingMultiple
                ? 'border-brand bg-brand/15 text-brand'
                : 'border-edge text-content-muted hover:border-brand/40 hover:text-content',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pick several</span>
          </button>
        )}

        {/* Ink options only while a pen is actually in hand. */}
        {tool === 'pen' && (
          <>
            <span className="hidden h-6 w-px bg-edge sm:block" />
            <ColorPicker value={color} onChange={setColor} options={TASK_COLORS.slice(0, 6)} />
            <label className="flex items-center gap-2 text-xs text-content-muted">
              Size
              <input
                type="range"
                min={1}
                max={12}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
                className="w-20 accent-brand"
              />
            </label>
          </>
        )}

        {/* A rubber has a size too, and it is the only thing about it worth
            setting — there is nothing to choose a colour for. */}
        {tool === 'eraser' && (
          <>
            <span className="hidden h-6 w-px bg-edge sm:block" />
            <label className="flex items-center gap-2 text-xs text-content-muted">
              Nib
              <input
                type="range"
                min={10}
                max={70}
                step={2}
                value={eraserWidth}
                onChange={(event) => setEraserWidth(Number(event.target.value))}
                className="w-20 accent-brand"
              />
              <span className="tabular-nums text-content-faint">{eraserWidth}px</span>
            </label>
          </>
        )}

        <span
          className={cn(
            'ml-auto text-[11px]',
            isConnected ? 'text-positive' : 'text-content-faint',
          )}
        >
          {isConnected ? 'Live with your team' : 'Offline — changes stay local'}
        </span>

        <ExpandToggle
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((expanded) => !expanded)}
          label={isExpanded ? 'Shrink' : 'Expand'}
        />

        {canClear && (
          <Button size="sm" variant="ghost" onClick={() => void handleClear()}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear ink
          </Button>
        )}
      </div>

      <div
        ref={surfaceRef}
        onPointerDown={marquee.onPointerDown}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-edge bg-surface-raised',
          'board-grid',
          isExpanded ? 'min-h-0 flex-1' : 'h-[62vh]',
          tool === 'select' && 'cursor-crosshair',
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          // touch-none stops the browser from scrolling while drawing on mobile.
          // The canvas only takes the pointer while a pen is out; otherwise the
          // Post-its and the lasso underneath it would never see an event.
          className={cn(
            'absolute inset-0 h-full w-full',
            isInking ? 'z-20 touch-none' : 'pointer-events-none',
            // A rubber is not a nib: the pointer should say which one is in
            // hand before the first stroke rather than after it.
            tool === 'pen' && 'cursor-crosshair',
            tool === 'eraser' && 'cursor-cell',
          )}
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
              key={note.id}
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

        {notes.length === 0 && !isInking && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <PostItGlyph className="h-8 w-8 text-content-faint" />
              <p className="text-sm font-semibold">A shared wall</p>
              <p className="max-w-xs text-xs leading-relaxed text-content-muted">
                Stick up a Post-it, pin an image or draw straight on the canvas. Everyone on the
                project sees it as you go.
              </p>
            </div>
          </div>
        )}

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
  );
};

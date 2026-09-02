import { useEffect, useMemo, useState } from 'react';

import type { Note, NoteLink } from '@/entities/note/model/types';
import { cn } from '@/shared/lib/cn';
import type { PositionBus } from '../lib/position-bus';

interface ConnectorLayerProps {
  notes: Note[];
  links: NoteLink[];
  /** Live drag coordinates, so a connector stays glued while a note moves. */
  bus: PositionBus;
  onSelectLink: (linkId: string) => void;
  /** The note a pending connector starts from, while the user picks the other end. */
  draftSourceId?: string | null;
  /** Pointer position in board coordinates, for the pending connector's tip. */
  pointer?: { x: number; y: number } | null;
  /** Highlights every connector so "click one to remove it" is visible. */
  isConnectMode?: boolean;
}

interface Point {
  x: number;
  y: number;
}

/** Where a connector should meet a card: its centre. */
const centreOf = (note: Note, live?: Point): Point => ({
  x: (live?.x ?? note.positionX) + note.width / 2,
  y: (live?.y ?? note.positionY) + note.height / 2,
});

/**
 * A curve rather than a straight line: two notes side by side get a readable
 * arc instead of a segment that disappears behind them, and the control point
 * offset perpendicular to the run keeps parallel connectors from overlapping.
 */
const curveBetween = (from: Point, to: Point): { d: string; tip: Point; control: Point } => {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  // Perpendicular bow, capped so long runs do not swing wildly off-screen.
  const bow = Math.min(60, length * 0.18);
  const control = {
    x: midX + (-dy / length) * bow,
    y: midY + (dx / length) * bow,
  };

  return { d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`, tip: to, control };
};

/** Arrowhead angle at the tip, taken from the quadratic's final tangent. */
const headTransform = (tip: Point, control: Point): string => {
  const angle = (Math.atan2(tip.y - control.y, tip.x - control.x) * 180) / Math.PI;
  return `translate(${tip.x} ${tip.y}) rotate(${angle})`;
};

/**
 * The connector layer.
 *
 * It subscribes to the drag bus and keeps its own copy of the live coordinates,
 * so a note being dragged repaints the arrows without re-rendering the board or
 * any of the other Post-its.
 */
export const ConnectorLayer = ({
  notes,
  links,
  bus,
  onSelectLink,
  draftSourceId,
  pointer,
  isConnectMode,
}: ConnectorLayerProps) => {
  const [live, setLive] = useState<Record<string, Point>>({});

  useEffect(() => bus.subscribe(setLive), [bus]);

  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const draftSource = draftSourceId ? byId.get(draftSourceId) : undefined;
  const draft =
    draftSource && pointer
      ? curveBetween(centreOf(draftSource, live[draftSource.id]), pointer)
      : null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      {/* The pending connector, tracking the cursor. Nothing explains "now
          click the other note" as well as a line already following you. */}
      {draft && (
        <g className="text-brand">
          <path
            d={draft.d}
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="8 7"
            fill="none"
            opacity={0.9}
          >
            <animate
              attributeName="stroke-dashoffset"
              from="30"
              to="0"
              dur="0.6s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M 0 0 L -11 -5.5 L -8 0 L -11 5.5 Z"
            fill="currentColor"
            transform={headTransform(draft.tip, draft.control)}
          />
        </g>
      )}

      {links.map((link) => {
        const source = byId.get(link.sourceId);
        const target = byId.get(link.targetId);
        if (!source || !target) return null;

        const { d, tip, control } = curveBetween(
          centreOf(source, live[source.id]),
          centreOf(target, live[target.id]),
        );
        const dashed = link.style === 'DASHED';

        return (
          <g key={link.id} className={cn('pointer-events-auto', isConnectMode && 'group/link')}>
            {/* Fat invisible hit area — a 2px curve is impossible to click. */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              className={isConnectMode ? 'cursor-crosshair' : 'cursor-pointer'}
            onClick={() => onSelectLink(link.id)}
            />
            {/* In connect mode every existing arrow gets a halo, so "click one
                to remove it" is something you can see rather than read. */}
            {isConnectMode && (
              <path
                d={d}
                stroke={link.color}
                strokeWidth={11}
                strokeLinecap="round"
                fill="none"
                opacity={0.18}
                className="transition-opacity group-hover/link:opacity-45"
              />
            )}
            <path
              d={d}
              stroke={link.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={dashed ? '7 6' : undefined}
              fill="none"
              opacity={0.9}
              style={{ filter: `drop-shadow(0 1px 3px ${link.color}55)` }}
            />

            {link.style !== 'LINE' && (
              <path
                d="M 0 0 L -11 -5.5 L -8 0 L -11 5.5 Z"
                fill={link.color}
                transform={headTransform(tip, control)}
              />
            )}
            {link.style === 'DOUBLE_ARROW' && (
              <path
                d="M 0 0 L -11 -5.5 L -8 0 L -11 5.5 Z"
                fill={link.color}
                transform={headTransform(
                  centreOf(source, live[source.id]),
                  control,
                )}
              />
            )}

            {link.label && (
              <text
                x={control.x}
                y={control.y - 6}
                textAnchor="middle"
                className="fill-current text-3xs font-semibold"
                style={{ fill: link.color }}
              >
                {link.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

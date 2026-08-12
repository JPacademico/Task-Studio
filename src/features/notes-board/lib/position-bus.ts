export interface Point {
  x: number;
  y: number;
}

type Listener = (positions: Record<string, Point>) => void;

export interface PositionBus {
  /** Called by a dragging Post-it on every frame. */
  publish: (id: string, x: number, y: number) => void;
  /** Drops the live override so the layer falls back to the persisted value. */
  release: (id: string) => void;
  subscribe: (listener: Listener) => () => void;
}

/**
 * A one-way channel from the dragging Post-it to the connector layer.
 *
 * Arrows have to stay glued to a card while it moves, but routing drag
 * coordinates through React state would re-render every note on the board 60
 * times a second. The bus keeps the coordinates outside React and hands them to
 * the single component that needs them, coalesced to one animation frame.
 */
export const createPositionBus = (): PositionBus => {
  const positions: Record<string, Point> = {};
  const listeners = new Set<Listener>();
  let frame = 0;

  const flush = () => {
    frame = 0;
    const snapshot = { ...positions };
    for (const listener of listeners) listener(snapshot);
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(flush);
  };

  return {
    publish: (id, x, y) => {
      positions[id] = { x, y };
      schedule();
    },
    release: (id) => {
      delete positions[id];
      schedule();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      };
    },
  };
};

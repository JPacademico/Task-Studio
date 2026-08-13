import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * The shared vocabulary every skin's icon set is written in.
 *
 * Three skins redraw the navigation rather than recolour it — the deep field,
 * the containment site and the press — and each of them needs the same two
 * things: the list of destinations there are icons *for*, and a 24×24 frame to
 * draw one in. Both live here so the sets can import them without importing
 * each other, and so `NavGlyph` can import all three without a cycle.
 */

/** Matches `ShortcutIcon` in the shortcuts store, which is where the keys come from. */
export type NavGlyphKey =
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'invitations'
  | 'recycle'
  | 'settings'
  | 'themes'
  | 'project';

export type GlyphProps = { className?: string };

export type GlyphSet = Record<NavGlyphKey, ComponentType<GlyphProps>>;

/** The frame. Same box, same defaults, so a set is only ever its drawings. */
export const Glyph = ({ className, children }: GlyphProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('h-4 w-4', className)}
  >
    {children}
  </svg>
);

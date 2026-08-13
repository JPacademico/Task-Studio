import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Mail,
  Palette,
  Settings,
  StickyNote,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import type { ShortcutIcon } from '../model/shortcuts.store';

/**
 * A component cannot be serialised into localStorage, so a pinned shortcut
 * stores a key and looks the glyph up here. Keeping the table in one place is
 * also what stops a renamed icon import from silently blanking a saved pill.
 */
export const SHORTCUT_ICONS: Record<ShortcutIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: CalendarDays,
  notes: StickyNote,
  invitations: Mail,
  recycle: Trash2,
  settings: Settings,
  themes: Palette,
  project: FolderKanban,
};

export const iconFor = (icon: ShortcutIcon): LucideIcon =>
  SHORTCUT_ICONS[icon] ?? SHORTCUT_ICONS.project;

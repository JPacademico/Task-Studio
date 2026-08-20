import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Mail,
  Palette,
  Settings,
  StickyNote,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import { useMyInvitations } from '@/entities/project/model/queries';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { useSignOut } from '@/features/auth/model/use-sign-out';
import { useTearOff } from '@/features/floating-shortcuts/lib/use-tear-off';
import {
  useFloatingShortcuts,
  type ShortcutIcon,
} from '@/features/floating-shortcuts/model/shortcuts.store';
import { TearOffGhost } from '@/features/floating-shortcuts/ui/tear-off-ghost';
import { useRouteIntentPrefetch } from '@/app/layouts/use-shell-prefetch';
import { cn } from '@/shared/lib/cn';
import { useEdgeReveal } from '@/shared/lib/use-edge-reveal';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useNavPreferences } from '@/shared/lib/nav-preferences.store';
import {
  AutumnHedge,
  Avatar,
  EdgeAffordance,
  EldritchTendrils,
  NavGlyph,
  NavPinButton,
  RunicText,
  StudioMark,
} from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

interface NavItem {
  to: string;
  /**
   * Translation keys, not the words themselves.
   *
   * `GROUPS` is a module constant, evaluated once at import — before any React
   * tree exists and long before the user's language is known. Holding resolved
   * strings here would freeze the menu into whatever language happened to load
   * first and never update it again when the language changed. Keys defer that
   * to render, where `t` is in scope and re-runs on every switch.
   */
  label: TranslationKey;
  icon: LucideIcon;
  /** Key the pinned copy stores, since a component cannot be serialised. */
  shortcutIcon: ShortcutIcon;
  end?: boolean;
  /** Short line under the label — only rendered in the primary group. */
  hint?: TranslationKey;
}

const GROUPS: { heading: TranslationKey; items: NavItem[] }[] = [
  {
    heading: 'nav.groupWorkspace',
    items: [
      {
        to: '/',
        label: 'nav.dashboard',
        icon: LayoutDashboard,
        shortcutIcon: 'dashboard',
        end: true,
        hint: 'nav.dashboardHint',
      },
      {
        to: '/tasks',
        label: 'nav.taskMenu',
        icon: CalendarDays,
        shortcutIcon: 'tasks',
        hint: 'nav.taskMenuHint',
      },
      {
        to: '/notes',
        label: 'nav.notesBoard',
        icon: StickyNote,
        shortcutIcon: 'notes',
        hint: 'nav.notesBoardHint',
      },
    ],
  },
  {
    heading: 'nav.groupManage',
    items: [
      { to: '/invitations', label: 'nav.invitations', icon: Mail, shortcutIcon: 'invitations' },
      { to: '/recycle-bin', label: 'nav.recycleBin', icon: Trash2, shortcutIcon: 'recycle' },
      // Its own entry rather than a section inside settings: choosing a look is
      // browsing, not configuring, and it has a gallery of its own.
      { to: '/themes', label: 'nav.themes', icon: Palette, shortcutIcon: 'themes' },
      { to: '/settings', label: 'nav.settings', icon: Settings, shortcutIcon: 'settings' },
    ],
  },
];

interface SidebarLinkProps {
  item: NavItem;
  badge?: number;
  isTouch: boolean;
  onNavigate?: () => void;
  /** Lets the rail stay open while a row is being pulled out of it. */
  onTearingChange: (isTearing: boolean) => void;
}

/**
 * One menu row — and, on a pointer device, something you can pull off the rail.
 *
 * Dragging it out drops a pinned copy wherever it is released; the row itself
 * never moves, so it can never be clipped by the nav's own scroll box.
 */
const SidebarLink = ({ item, badge, isTouch, onNavigate, onTearingChange }: SidebarLinkProps) => {
  const t = useT();
  // Inert for every row but the two workspace routes — see the hook.
  const intent = useRouteIntentPrefetch(item.to);
  const addShortcut = useFloatingShortcuts((state) => state.add);
  const isPinnedOut = useFloatingShortcuts((state) =>
    state.items.some((entry) => entry.id === `nav:${item.to}`),
  );

  const { bind, ghost } = useTearOff({
    enabled: !isTouch,
    onTearOff: (point) =>
      addShortcut({
        id: `nav:${item.to}`,
        kind: 'nav',
        to: item.to,
        // Both: the key so the pill follows the language, and the resolved
        // text so anything reading `label` blindly still has something sane.
        labelKey: item.label,
        label: t(item.label),
        icon: item.shortcutIcon,
        x: point.x - 90,
        y: point.y - 22,
      }),
  });

  // Mirror the gesture up so the rail does not slide shut under the pointer.
  useEffect(() => onTearingChange(Boolean(ghost)), [ghost, onTearingChange]);

  return (
    <>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={isTouch ? onNavigate : undefined}
        title={isTouch ? undefined : 'Drag me out to pin this anywhere on screen'}
        {...intent}
        {...bind}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5',
            'transition-colors duration-150',
            // Press-and-drag has to beat the browser's own text selection, or
            // the gesture turns into a highlight halfway through the label.
            !isTouch && 'cursor-grab select-none active:cursor-grabbing',
            isActive
              ? 'text-content'
              : 'text-content-muted hover:bg-surface-sunken/70 hover:text-content',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              // One shared element slides between items instead of
              // each row cross-fading its own background.
              <motion.span
                layoutId="sidebar-active"
                transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                className="absolute inset-0 rounded-2xl border border-brand/25 bg-brand/12"
              />
            )}

            <span
              className={cn(
                'relative grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors duration-150',
                isActive
                  ? 'bg-brand text-brand-contrast shadow-[0_6px_16px_-8px_rgb(var(--brand)/0.9)]'
                  : 'bg-surface-sunken text-content-faint group-hover:text-content',
              )}
            >
              {/* The skin decides what a destination looks like — the deep
                  field draws these as planets rather than line icons. */}
              <NavGlyph glyph={item.shortcutIcon} fallback={item.icon} className="h-4 w-4" />
            </span>

            {/*
              On the runic skin a destination is carved rather than printed:
              the label is cut in Elder Futhark and turns back into Latin the
              moment the row is hovered or focused, and the hint under it stays
              carved because it is a gloss rather than the name of anywhere.
              `RunicText` is a pass-through on the other nine themes, which is
              why there is no skin check here.
            */}
            <span className="relative min-w-0 flex-1">
              <span
                className={cn('block truncate text-sm', isActive ? 'font-semibold' : 'font-medium')}
              >
                <RunicText>{t(item.label)}</RunicText>
              </span>
              {item.hint && (
                <span className="block truncate text-[10px] text-content-faint">
                  <RunicText mode="always">{t(item.hint)}</RunicText>
                </span>
              )}
            </span>

            {/* A copy of this row is already pinned to the screen somewhere. */}
            {isPinnedOut && (
              <span
                aria-hidden
                title={t('nav.pinnedHint')}
                className="relative h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              />
            )}

            {badge !== undefined && badge > 0 && (
              <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-contrast">
                {badge}
              </span>
            )}
          </>
        )}
      </NavLink>

      <TearOffGhost point={ghost} label={t(item.label)} icon={item.icon} />
    </>
  );
};

interface HiddenSidebarProps {
  /** Mobile drawer state, driven by the top bar's menu button. */
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * Desktop: a rail that stays hidden and slides out when the pointer approaches
 * the left edge, unless the user pins it open. Mobile: a normal drawer, since
 * hover does not exist there.
 *
 * The slide is a single `transform` animation on a fixed-position element, so it
 * never triggers layout on the page content.
 */
export const HiddenSidebar = ({ isMobileOpen, onMobileClose }: HiddenSidebarProps) => {
  const t = useT();
  const isTouch = useIsTouchDevice();
  const user = useCurrentUser();
  const signOut = useSignOut();

  const isPinned = useNavPreferences((state) => state.pinned.left);
  const togglePin = useNavPreferences((state) => state.togglePin);

  // A row being dragged out takes the pointer off the panel, which would
  // otherwise read as "the user left" and slide the rail shut mid-gesture.
  const [isTearing, setIsTearing] = useState(false);

  const { isRevealed, pin, unpin, close } = useEdgeReveal({
    edge: 'left',
    threshold: 22,
    hideDistance: 300,
    enabled: !isTouch,
    locked: isPinned || isTearing,
  });

  const { data: invitations } = useMyInvitations();
  const pendingCount = invitations?.length ?? 0;

  const isOpen = isTouch ? isMobileOpen : isRevealed;

  return (
    <>
      {!isTouch && (
        <EdgeAffordance edge="left" isHidden={!isOpen} label={t('nav.hoverHintMenu')} />
      )}

      {isTouch && isMobileOpen && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onMobileClose}
        />
      )}

      <motion.aside
        onMouseEnter={isTouch ? undefined : pin}
        onMouseLeave={
          isTouch
            ? undefined
            : () => {
                if (isTearing) return;
                unpin();
                close();
              }
        }
        initial={false}
        animate={{ x: isOpen ? 0 : 'calc(-100% - 12px)' }}
        transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.7 }}
        className={cn(
          'nav-rail nav-rail--left ui-textured gpu fixed left-0 top-0 z-50 flex h-full w-[264px] flex-col',
          'safe-t safe-b safe-l',
          // `backdrop-blur-md`, not `-xl`: a full-height blurred panel makes
          // the browser resample everything behind it on every frame it moves,
          // and the rail moves on every reveal. At 95% opacity the difference
          // between a 12px and a 24px blur is invisible; the cost is not.
          'border-r border-edge bg-surface-raised/95 backdrop-blur-md',
          // A brand-tinted wash down the rail plus a lit inner edge: the panel
          // should read as a lit surface, not a flat grey box.
          'bg-[radial-gradient(120%_60%_at_0%_0%,rgb(var(--brand)/0.16),transparent_62%)]',
          'shadow-[8px_0_40px_-24px_rgb(0_0_0/0.65)]',
        )}
      >
        {/* Lit inner edge. */}
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand/45 to-transparent"
        />

        {/* Whatever is growing out of the seam this rail shares with the page.
            Each of these renders on exactly one skin and returns null on the
            other eight, and both stop moving while the rail is shut. */}
        <EldritchTendrils edge="left" isActive={isOpen} />
        <AutumnHedge edge="left" isActive={isOpen} />

        <header className="flex items-center gap-2.5 px-4 pb-4 pt-5">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand shadow-[0_8px_20px_-10px_rgb(var(--brand)/0.9)]">
            <StudioMark className="h-7 w-7" />
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-brand/25"
            />
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold tracking-tight">Task Studio</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-content-faint">
              {t('nav.studioWorkspace')}
            </p>
          </div>

          {!isTouch && <NavPinButton isPinned={isPinned} onToggle={() => togglePin('left')} />}
        </header>

        <nav className="scrollbar-thin flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-3">
          {GROUPS.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-content-faint">
                {/* A section heading names a shelf, not a destination — there
                    is nothing to click and therefore nothing to reveal, so it
                    stays carved. */}
                <RunicText mode="always">{t(group.heading)}</RunicText>
              </p>

              {group.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  item={item}
                  isTouch={isTouch}
                  badge={item.to === '/invitations' ? pendingCount : undefined}
                  onNavigate={onMobileClose}
                  onTearingChange={setIsTearing}
                />
              ))}
            </div>
          ))}
        </nav>

        <footer className="border-t border-edge/70 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold">{user?.displayName ?? 'Signed in'}</p>
              <p className="truncate text-[10px] text-content-faint">{user?.email}</p>
            </div>
          </div>

          {/*
            The way out, next to the person it signs out.

            The top bar's account menu has always had this, but that bar is
            hidden behind a hover on the *opposite* edge — so the one panel
            already showing who you are had no way to stop being you. It is not
            a `SidebarLink`: this is an action rather than a destination, so it
            never wears the active pill and never tears off into a shortcut.
          */}
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(
              'mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-transparent px-3 py-2',
              'text-xs font-semibold text-content-muted transition-colors duration-150',
              'hover:border-danger/30 hover:bg-danger/10 hover:text-danger',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40',
            )}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-surface-sunken">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            {t('nav.signOut')}
          </button>

          {!isTouch && (
            <p className="mt-2.5 text-[10px] leading-relaxed text-content-faint">
              {isPinned
                ? 'Pinned open. Tap the pin again to let it hide.'
                : 'Nudge the screen edge to bring the menus back. Drag an entry out to keep it on screen.'}
            </p>
          )}
        </footer>
      </motion.aside>
    </>
  );
};

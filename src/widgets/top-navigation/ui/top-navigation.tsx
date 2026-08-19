import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Menu, Plus, Wifi, WifiOff } from 'lucide-react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { useSessionStore } from '@/features/auth/model/session.store';
import { useSignOut } from '@/features/auth/model/use-sign-out';
import { NotificationBell } from '@/features/notifications/ui/notification-bell';
import { useT } from '@/shared/i18n';
import { LanguageToggle } from '@/features/language-toggle/ui/language-toggle';
import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useNavPreferences } from '@/shared/lib/nav-preferences.store';
import { useEdgeReveal } from '@/shared/lib/use-edge-reveal';
import { Avatar, Button, EdgeAffordance, NavPinButton, StudioMark } from '@/shared/ui';

interface TopNavigationProps {
  onOpenMobileMenu: () => void;
  onCreateProject: () => void;
}

/**
 * Mirror of the sidebar behaviour on the top edge: hidden by default on
 * desktop, revealed on pointer proximity, always visible on touch.
 */
export const TopNavigation = ({ onOpenMobileMenu, onCreateProject }: TopNavigationProps) => {
  const t = useT();
  const isTouch = useIsTouchDevice();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isConnected } = useRealtime();
  const user = useSessionStore((state) => state.user);
  const signOut = useSignOut();

  const isPinned = useNavPreferences((state) => state.pinned.top);
  const togglePin = useNavPreferences((state) => state.togglePin);

  const { isRevealed, pin, unpin, close } = useEdgeReveal({
    edge: 'top',
    threshold: 20,
    hideDistance: 160,
    enabled: !isTouch,
    locked: isPinned,
  });

  const isOpen = isTouch || isRevealed;

  return (
    <>
      {!isTouch && (
        <EdgeAffordance edge="top" isHidden={!isOpen} label={t('nav.hoverHintBar')} />
      )}

      <motion.header
        onMouseEnter={isTouch ? undefined : pin}
        onMouseLeave={
          isTouch
            ? undefined
            : () => {
                unpin();
                close();
              }
        }
        initial={false}
        animate={{ y: isOpen ? 0 : 'calc(-100% - 6px)' }}
        transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.7 }}
        className={cn(
          'nav-rail nav-rail--top ui-textured gpu fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4',
          'border-b border-edge bg-surface-raised/90 backdrop-blur-xl',
          'shadow-[0_10px_30px_-24px_rgb(0_0_0/0.8)]',
        )}
      >
        {/* Lit lower edge, mirroring the sidebar's inner edge. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent"
        />

        {isTouch && (
          <Button variant="ghost" size="icon" onClick={onOpenMobileMenu} aria-label={t('nav.openMenu')}>
            <Menu className="h-4 w-4" />
          </Button>
        )}

        <Link to="/" className="group flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand ring-1 ring-inset ring-brand/25">
            <StudioMark className="h-6 w-6" interactive />
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:block">Task Studio</span>
        </Link>

        <span
          title={isConnected ? t('nav.realtimeConnected') : t('nav.realtimeOffline')}
          className={cn(
            'ml-1 hidden items-center gap-1.5 rounded-full border border-edge px-2 py-1 text-[10px] sm:inline-flex',
            isConnected ? 'text-positive' : 'text-content-faint',
          )}
        >
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? t('nav.live') : t('nav.offline')}
        </span>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {!isTouch && <NavPinButton isPinned={isPinned} onToggle={() => togglePin('top')} />}

          <Button size="sm" onClick={onCreateProject} className="hidden sm:inline-flex">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
            {t('nav.newProject')}
          </Button>
          {/* Phones get the same action as a single glyph rather than losing it. */}
          <Button
            size="icon"
            onClick={onCreateProject}
            aria-label={t('nav.newProject')}
            className="sm:hidden"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
          </Button>

          <NotificationBell />
          <LanguageToggle />
          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="ml-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              aria-label={t('nav.accountMenu')}
            >
              <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="sm" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="panel absolute right-0 top-11 z-50 w-56 overflow-hidden p-1.5"
                >
                  <div className="border-b border-edge px-3 py-2.5">
                    <p className="truncate text-sm font-medium">{user?.displayName}</p>
                    <p className="truncate text-[11px] text-content-faint">{user?.email}</p>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-sunken hover:text-content"
                  >
                    {t('nav.profileSettings')}
                  </Link>

                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t('nav.signOut')}
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
};

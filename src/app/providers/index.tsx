import { useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { installApiWarmOnIntent } from '@/shared/api/warm-on-intent';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { QueryProvider } from './query-provider';
import { RealtimeProvider } from './realtime-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider, useTheme } from './theme-provider';

/**
 * The toast layer, wearing the app's theme rather than its own.
 *
 * Two things had it looking like a different application every time it
 * appeared, and both are fixed here rather than by restyling toasts one by one.
 *
 * 1. **`theme="system"` ignored the app's own setting.** The palette in this
 *    app is a *preference* — LIGHT, DARK or SYSTEM, mirrored to the account and
 *    resolved by `ThemeProvider` — and only the third of those agrees with the
 *    OS. Someone reading a dark app on a light desktop got white toasts on it.
 *    Reading `isDark` means the toaster resolves the preference exactly once,
 *    in the same place everything else does.
 *
 * 2. **Its colours were literals.** Sonner ships `#fff` / `#000` and a fixed
 *    set of pastel accents, so even with the right light/dark half it had no
 *    idea the surface behind it might be newsprint, basalt or a CRT. The
 *    palette is redirected to the design tokens in `index.css` — see the
 *    `[data-sonner-toaster]` block there — which is what makes a toast land as
 *    part of whichever skin is on.
 *
 * `richColors` stays on: with the accents pointed at `--positive`, `--danger`
 * and `--warning`, a tinted toast now reads as this app's success or failure
 * rather than as Sonner's, and the tint is what makes the type of a message
 * legible at a glance without reading it.
 */
const AppToaster = () => {
  const isTouch = useIsTouchDevice();
  const { isDark } = useTheme();

  return (
    /*
      Bottom-centre on a phone, bottom-right everywhere else.

      A corner toast on a 375px screen is not in a corner — it is a full-width
      bar pinned to one side, which reads as misaligned rather than placed.
      Centred is the convention there, and the offset lifts it clear of the home
      indicator, which the toast would otherwise sit underneath in the installed
      PWA.
    */
    <Toaster
      position={isTouch ? 'bottom-center' : 'bottom-right'}
      offset={isTouch ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : undefined}
      theme={isDark ? 'dark' : 'light'}
      closeButton
      richColors
      // Radius, material and shadow come from the skin — see index.css. Only the
      // type scale is set here, because it is the one thing a toast should not
      // inherit from a skin that sets display type in a poster face.
      toastOptions={{ className: 'text-sm', duration: 4200 }}
    />
  );
};

/**
 * Provider order matters: query cache → session (needs the cache to clear it)
 * → theme (reads the user) → realtime (needs an authenticated session).
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  /*
   * Outside every provider on purpose.
   *
   * It needs no session, no cache and no theme — it is two passive document
   * listeners that start the API booting when somebody begins typing, so that
   * the cold start is paid for during the typing rather than after it. See
   * `warm-on-intent` for why that is nearly free. Installed here because this
   * is the one component guaranteed to be mounted for the life of the tab.
   */
  useEffect(installApiWarmOnIntent, []);

  return (
    <BrowserRouter>
      <QueryProvider>
        <SessionProvider>
          <ThemeProvider>
            <RealtimeProvider>
              {children}
              <AppToaster />
            </RealtimeProvider>
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </BrowserRouter>
  );
};

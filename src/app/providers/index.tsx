import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { installApiWarmOnIntent } from '@/shared/api/warm-on-intent';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { QueryProvider } from './query-provider';
import { RealtimeProvider } from './realtime-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider, useTheme } from './theme-provider';

/** The toast layer, wearing the app's theme rather than its own. */
/**
 * How long a toast stays, in one place. Read twice below: once by Sonner, which dismisses on it,
 * and once by the stylesheet, which draws it.
 */
const TOAST_DURATION_MS = 4_200;

const AppToaster = () => {
  const isTouch = useIsTouchDevice();
  const { isDark } = useTheme();

  return (
    /* Bottom-centre on a phone, bottom-right everywhere else. A corner toast on a 375px screen is
       not in a corner — it is a full-width bar pinned to one side. */
    <Toaster
      position={isTouch ? 'bottom-center' : 'bottom-right'}
      offset={isTouch ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : undefined}
      theme={isDark ? 'dark' : 'light'}
      closeButton
      richColors
      // Radius, material and shadow come from the skin — see index.css.
      toastOptions={{
        className: 'text-sm',
        duration: TOAST_DURATION_MS,
        /* The same number again, this time where CSS can read it. The timer bar along the bottom of
           a toast is a CSS animation (see `[data-content]::after` in `index.css`). */
        style: { '--ts-toast-duration': `${TOAST_DURATION_MS}ms` } as CSSProperties,
      }}
    />
  );
};

/**
 * Provider order matters: query cache → session (needs the cache to clear it)
 * → theme (reads the user) → realtime (needs an authenticated session).
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  // Outside every provider on purpose. It needs no session, no cache and no theme — it is two
  // passive document listeners that start the API booting when somebody begins typing.
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

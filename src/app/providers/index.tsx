import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useIsTouchDevice } from '@/shared/lib/hooks';
import { QueryProvider } from './query-provider';
import { RealtimeProvider } from './realtime-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';

/**
 * Provider order matters: query cache → session (needs the cache to clear it)
 * → theme (reads the user) → realtime (needs an authenticated session).
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const isTouch = useIsTouchDevice();

  return (
  <BrowserRouter>
    <QueryProvider>
      <SessionProvider>
        <ThemeProvider>
          <RealtimeProvider>
            {children}
            {/*
              Bottom-centre on a phone, bottom-right everywhere else.
              
              A corner toast on a 375px screen is not in a corner — it is a
              full-width bar pinned to one side, which reads as misaligned
              rather than placed. Centred is the convention there, and the
              offset lifts it clear of the home indicator, which the toast would
              otherwise sit underneath in the installed PWA.
            */}
            <Toaster
              position={isTouch ? 'bottom-center' : 'bottom-right'}
              offset={
                isTouch ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : undefined
              }
              theme="system"
              closeButton
              richColors
              // Matches the app's motion language rather than Sonner's default.
              toastOptions={{
                className: 'font-sans text-sm',
                style: { borderRadius: '14px' },
                duration: 4200,
              }}
            />
          </RealtimeProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryProvider>
  </BrowserRouter>
);
};

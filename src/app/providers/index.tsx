import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { QueryProvider } from './query-provider';
import { RealtimeProvider } from './realtime-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';

/**
 * Provider order matters: query cache → session (needs the cache to clear it)
 * → theme (reads the user) → realtime (needs an authenticated session).
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <QueryProvider>
      <SessionProvider>
        <ThemeProvider>
          <RealtimeProvider>
            {children}
            <Toaster
              position="bottom-right"
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

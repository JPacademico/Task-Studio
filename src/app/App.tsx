import { RuneClickGlow, SpaceCursor } from '@/shared/ui';

import { MobileGate } from './layouts/mobile-gate';
import { AppProviders } from './providers';
import { AppRouter } from './router';

/**
 * Inside the providers, not outside them. The gate renders a themed page of its own — the skin's
 * panel, its tape, its tokens — so it has to be under `ThemeProvider` to know which skin that is.
 */
export const App = () => (
  <AppProviders>
    {/* Here rather than in the app shell, because these pointers are drawn on every page the
        skin is worn on, the landing page and sign-in included. */}
    <RuneClickGlow />
    <SpaceCursor />
    <MobileGate>
      <AppRouter />
    </MobileGate>
  </AppProviders>
);

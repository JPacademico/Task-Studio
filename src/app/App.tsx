import { RuneClickGlow } from '@/shared/ui';

import { MobileGate } from './layouts/mobile-gate';
import { AppProviders } from './providers';
import { AppRouter } from './router';

/**
 * Inside the providers, not outside them.
 *
 * The gate renders a themed page of its own — the skin's panel, its tape, its
 * tokens — so it has to be under `ThemeProvider` to know which skin that is.
 * Outside, a phone would get the notice drawn in the default palette regardless
 * of what the reader had chosen, which is the one screen where looking
 * unfinished is the opposite of the point.
 */
export const App = () => (
  <AppProviders>
    {/* Here rather than in the app shell, because the rune pointer is drawn on
        every page the skin is worn on, the landing page and sign-in included,
        and its click should glow wherever it does. Renders nothing. */}
    <RuneClickGlow />
    <MobileGate>
      <AppRouter />
    </MobileGate>
  </AppProviders>
);

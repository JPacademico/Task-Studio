/**
 * Applies the stored palette and skin before first paint.
 *
 * ## Why this is a file and not an inline `<script>`
 *
 * It used to be inline in `index.html`, which is the conventional place for a
 * theme-flash guard — and which is exactly what forces `script-src
 * 'unsafe-inline'` into the Content-Security-Policy. `unsafe-inline` is not a
 * narrow allowance: it re-enables every injected `<script>` on the page, which
 * is the one thing a CSP is there to stop, and it would have turned any
 * sanitiser bypass in the rich-text editor back into a stolen session.
 *
 * A same-origin file costs one extra request against a warm HTTP/2 connection —
 * it is precached by the service worker and served from the same host as the
 * document — and buys a policy with no `unsafe-inline` in it at all. See
 * `vercel.json`.
 *
 * Loaded synchronously in `<head>`, before the stylesheet, so the class and the
 * attribute are on `<html>` by the time anything paints. Making it `defer` or
 * `type="module"` would defeat the entire purpose: both run after the document
 * has been parsed, which is after the first frame the user sees.
 */
(() => {
  const root = document.documentElement;

  try {
    const stored = localStorage.getItem('task-studio:theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'DARK' || ((!stored || stored === 'SYSTEM') && prefersDark);
    root.classList.toggle('dark', dark);

    // Kept in step with SKIN_ATTRIBUTE in theme-provider.tsx.
    // STEAMPUNK is the old name for VINTAGE and still sits in stored
    // preferences, so it resolves to the same skin rather than silently
    // dropping the user back to Studio on their next visit.
    const SKINS = {
      PAPER: 'paper',
      TERMINAL: 'terminal',
      VINTAGE: 'vintage',
      STEAMPUNK: 'vintage',
      PIXEL: 'pixel',
      SPACE: 'space',
      HAZARD: 'hazard',
      NEWSPAPER: 'newspaper',
      ELDRITCH: 'eldritch',
      AUTUMN: 'autumn',
      RUNIC: 'runic',
      UNDERWATER: 'underwater',
      VOLCANO: 'volcano',
      STUDIO: 'studio',
    };
    root.dataset.skin = SKINS[localStorage.getItem('task-studio:theme-skin')] || 'studio';
  } catch {
    /* private mode — fall back to the class already on <html> */
    root.dataset.skin = 'studio';
  }
})();

/**
 * Applies the stored palette, skin and cursor preference before first paint.
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
      HALLOWEEN: 'halloween',
      VIBECODED: 'vibecoded',
      STUDIO: 'studio',
    };
    root.dataset.skin = SKINS[localStorage.getItem('task-studio:theme-skin')] || 'studio';

    /*
     * The cursor opt-out, which has to be here rather than in React for the
     * same reason the skin does — only more so.
     *
     * A skin arriving late is a flash of the wrong colour. A *cursor* arriving
     * late is a knife appearing under somebody's hand a beat after the page
     * does, on a machine where they had turned it off. Written only when it is
     * off, matching the `html:not([data-cursor='off'])` gate in the stylesheet:
     * the default costs nothing and needs no attribute.
     */
    if (localStorage.getItem('task-studio:custom-cursor') === 'off') {
      root.dataset.cursor = 'off';
    }
  } catch {
    /* private mode — fall back to the class already on <html> */
    root.dataset.skin = 'studio';
  }
})();

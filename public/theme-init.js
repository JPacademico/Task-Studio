/**
 * Applies the stored palette, skin and cursor preference before first paint. It used to be inline
 * in `index.html`, which is the conventional place for a theme-flash guard.
 */
(() => {
  const root = document.documentElement;

  try {
    const stored = localStorage.getItem('task-studio:theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'DARK' || ((!stored || stored === 'SYSTEM') && prefersDark);
    root.classList.toggle('dark', dark);

    // Kept in step with SKIN_ATTRIBUTE in theme-provider.tsx. STEAMPUNK is the old name for VINTAGE
    // and still sits in stored preferences.
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
      DRAGON: 'dragon',
      STUDIO: 'studio',
    };
    root.dataset.skin = SKINS[localStorage.getItem('task-studio:theme-skin')] || 'studio';

    // The cursor opt-out, which has to be here rather than in React for the same reason the skin
    // does — only more so. A skin arriving late is a flash of the wrong colour.
    if (localStorage.getItem('task-studio:custom-cursor') === 'off') {
      root.dataset.cursor = 'off';
    }
  } catch {
    /* private mode — fall back to the class already on <html> */
    root.dataset.skin = 'studio';
  }
})();

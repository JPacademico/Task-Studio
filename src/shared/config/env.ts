/**
 * Single place the browser bundle reads configuration from.
 *
 * Only `VITE_*` values exist at runtime — API keys and database URLs live on the
 * NestJS side and are never shipped to the client.
 *
 * ## Why the production branch has no fallback
 *
 * Vite inlines `import.meta.env.VITE_*` at *build* time. `.env` is gitignored,
 * so a hosted build only sees what the host's dashboard provides — and when
 * that is nothing, an `??` default does not degrade, it *bakes the developer's
 * laptop address into the bundle every visitor downloads*. The app then loads
 * perfectly, renders every screen, and fails on the first request with
 * `ERR_CONNECTION_REFUSED` against `localhost` — a machine the visitor's
 * browser is quite happy to try and which is, for them, simply not running a
 * server.
 *
 * That is the worst shape a misconfiguration can take: invisible to CI,
 * invisible to the build log, and indistinguishable at the UI from the API
 * being down. So the fallback is scoped to `DEV`, where localhost is genuinely
 * the right guess, and a production build without the variable fails loudly —
 * first in `vite.config.ts`, which aborts the build before an artefact exists,
 * and here as the backstop for anything that reaches the browser anyway.
 */
const stripTrailingSlash = (value: string): string => value.replace(/\/$/, '');

/** Localhost is only ever a sensible default while a dev server is running. */
const DEV_API_URL = 'http://localhost:3333/api/v1';

const resolveApiUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  if (import.meta.env.DEV) return DEV_API_URL;

  throw new Error(
    'VITE_API_URL is not set. A production build must be given the API origin ' +
      'at build time (Vercel → Settings → Environment Variables), because Vite ' +
      'inlines it into the bundle. Set it to the deployed API including the ' +
      'version prefix, e.g. https://task-studio-api.onrender.com/api/v1, then ' +
      'redeploy — changing the variable alone does not rebuild the bundle.',
  );
};

const apiUrl = resolveApiUrl();

export const env = {
  apiUrl,
  /** Socket.io connects to the origin, not the versioned API path. */
  socketUrl: stripTrailingSlash(
    import.meta.env.VITE_SOCKET_URL?.trim() || apiUrl.replace(/\/api\/v\d+$/, ''),
  ),
  isDev: import.meta.env.DEV,
} as const;

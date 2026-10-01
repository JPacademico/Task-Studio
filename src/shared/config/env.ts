/**
 * Single place the browser bundle reads configuration from. Only `VITE_*` values exist at runtime —
 * API keys and database URLs live on the NestJS side and are never shipped to the client.
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

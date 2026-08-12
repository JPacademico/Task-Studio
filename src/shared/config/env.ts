/**
 * Single place the browser bundle reads configuration from.
 *
 * Only `VITE_*` values exist at runtime — API keys and database URLs live on the
 * NestJS side and are never shipped to the client.
 */
const stripTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const apiUrl = stripTrailingSlash(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1',
);

export const env = {
  apiUrl,
  /** Socket.io connects to the origin, not the versioned API path. */
  socketUrl: stripTrailingSlash(
    import.meta.env.VITE_SOCKET_URL ?? apiUrl.replace(/\/api\/v\d+$/, ''),
  ),
  isDev: import.meta.env.DEV,
} as const;

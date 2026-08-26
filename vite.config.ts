import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Refuse to produce a production bundle that points at nothing.
 *
 * `import.meta.env.VITE_*` is substituted at build time, not read at runtime,
 * so a hosted build inherits only what the host's dashboard sets — and `.env`
 * is gitignored, so that is routinely nothing on the first deploy. Without this
 * check the build succeeds, the site loads, and every request goes to whatever
 * default the source happened to carry: for a visitor, a dead address on their
 * own machine.
 *
 * Failing here is the whole point. A red build with this message costs one
 * minute; the alternative is a green deploy that looks correct and is
 * debuggable only from the browser console of whoever tried to sign up.
 */
const assertDeployConfig = (mode: string): void => {
  if (mode !== 'production') return;

  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (env.VITE_API_URL?.trim()) return;

  throw new Error(
    [
      '',
      'VITE_API_URL is required for a production build.',
      '',
      'Vite bakes this value into the bundle, so it must exist at build time -',
      'setting it afterwards does not change an already-built deployment.',
      '',
      'On Vercel: Settings > Environment Variables > add VITE_API_URL for',
      'Production, Preview and Development, then redeploy with the build cache',
      'disabled.',
      '',
      '  VITE_API_URL=https://<your-api>.onrender.com/api/v1',
      '  VITE_SOCKET_URL=https://<your-api>.onrender.com',
      '',
      'Include the /api/v1 suffix on VITE_API_URL and omit it on',
      'VITE_SOCKET_URL: Socket.io connects to the origin, not the REST path.',
      '',
    ].join(String.fromCharCode(10)),
  );
};

/**
 * The production Content-Security-Policy, so `vite preview` behaves like the
 * deployed site.
 *
 * ## Why it is duplicated here
 *
 * Because a CSP fails *closed*: a wrong directive does not degrade the app, it
 * stops a script or a stylesheet loading, and the symptom is a blank page. The
 * policy is served by Vercel's edge (`vercel.json`), which means it is not
 * present in any local build — so the one environment where a mistake could be
 * caught before deploy was the one environment that did not have it.
 *
 * Mirroring it on `npm run preview` turns "hope it still works in production"
 * into a check anybody can run in thirty seconds. `SECURITY.md` describes what
 * to click.
 *
 * It has to be kept in step with `vercel.json` by hand, and there is no way
 * around that: `vercel.json` is JSON with no imports, and Vercel reads it
 * without executing anything. Divergence is caught by the check above — the
 * preview breaks and production does not, or the other way round.
 *
 * One directive is intentionally *looser* here than in production; see the
 * note on `connect-src` below.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  /*
   * `http://localhost:*` and `ws://localhost:*` are the one deliberate
   * difference from `vercel.json`, and they are added *here* rather than
   * there so production never carries them.
   *
   * The deployed API is `https://…`, which the `https:` scheme already
   * allows. A local one is plain HTTP on port 3333, which it does not — so
   * without this, mirroring the policy would break every request in
   * `npm run preview` while proving nothing about production. (Which is
   * precisely what it did on first run, and is a fair demonstration that the
   * mirror earns its keep.)
   */
  "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  /*
   * The text board's PDF preview, and nothing else.
   *
   * There was no `frame-src` at all, so framing fell through to `default-src
   * 'self'` and the preview was blocked. `blob:` is the narrowest directive
   * that unblocks it: the file is fetched through the API — which checks the
   * project's roster on the way, something a storage URL cannot do — and
   * framed from an object URL built in the page. Allowing the storage origin
   * instead would have opened framing to a whole host for one feature, and to
   * every other page in the app along with it.
   */
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

export default defineConfig(({ mode }) => {
  assertDeployConfig(mode);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // iOS/Safari needs the real files present, not just a generated manifest.
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          id: '/',
          name: 'Task Studio',
          short_name: 'Task Studio',
          description: 'Personal and collaborative project management studio.',
          lang: 'en',
          theme_color: '#0f0f12',
          background_color: '#0f0f12',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          categories: ['productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // SPA fallback so a deep link opens offline from the app shell.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              /*
               * API responses: try the network, fall back to cache offline.
               *
               * `pathname` rather than the full URL because the API is a
               * different origin in production (Render) and the same origin in
               * dev — the version prefix is the stable part.
               *
               * `statuses: [200]`, not `[0, 200]`. A `0` is an *opaque*
               * response: the body and status are unreadable by design, so
               * storing one means the cache can later hand back something it
               * cannot even tell was a failure, and NetworkFirst will serve it
               * as though the request had succeeded. Media below is the case
               * where `0` is legitimate — cross-origin R2 images fetched
               * without CORS — and it is the only one.
               *
               * `networkTimeoutSeconds` stays well under the client's request
               * timeout: this decides when to *show* something stale, not when
               * to give up on the request.
               */
              /*
               * `/source` is excluded, and it is the only exclusion.
               *
               * Every other API response is JSON measured in kilobytes. That
               * one streams an imported document's original file back through
               * the API — up to 10 MB of PDF per page — and this cache holds
               * 200 entries. Ten opened imports would evict most of the JSON
               * this cache exists to keep, to store binaries the offline app
               * has no use for: the text board cannot render an imported page
               * offline anyway, because the conversion it offers is a call to
               * a language model.
               */
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') && !url.pathname.endsWith('/source'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'task-studio-api',
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // R2 assets are immutable once uploaded.
              urlPattern: ({ url }) => /r2\.dev|r2\.cloudflarestorage\.com/.test(url.hostname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'task-studio-media',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Honour PORT so container hosts and preview tooling can place the server.
      port: Number(process.env.PORT) || 5173,
      strictPort: false,
    },
    /*
     * `npm run preview` serves the built app under the real policy.
     *
     * Deliberately not applied to `server` (the dev server): Vite's dev
     * transform injects the HMR client and React Refresh preamble inline, so a
     * `script-src` without `unsafe-inline` breaks development entirely while
     * proving nothing about the production bundle, which has no inline script
     * at all.
     */
    preview: {
      headers: {
        'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Keeps the heavy animation/DnD layer out of the first paint chunk.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers'],
            data: ['@tanstack/react-query', 'axios', 'socket.io-client'],
          },
        },
      },
    },
  };
});

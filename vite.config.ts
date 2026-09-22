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
          /*
           * The WebGL chunks are cached on demand, never precached.
           *
           * Precaching downloads every listed file on the first visit, before
           * anything is asked for — which for these would mean handing three
           * megabytes to a visitor whose phone, connection or motion preference
           * means they will never render a single frame of it. That is the
           * exact cost `useCanvasBudget` and the `lazy` boundaries exist to
           * avoid, and a precache manifest quietly undoes all of it: the
           * install step fetches the chunks whatever the application decides.
           *
           * Excluded here and picked up by the runtime rule below, so a reader
           * who *does* see the effects still gets them from the cache on their
           * second visit.
           */
          globIgnores: ['**/webgl-*.js', '**/shaders-*.js'],
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
                plugins: [
                  {
                    /*
                     * Answer with a response instead of rejecting, and this is
                     * the fix for a console full of errors in a working app.
                     *
                     * ## What was happening
                     *
                     * `NetworkFirst` falls back to the cache when the network
                     * call fails, and *rejects* when the cache has nothing
                     * either. A rejected handler makes the `FetchEvent` resolve
                     * to a network error, and Chrome prints one line per
                     * occurrence:
                     *
                     *   The FetchEvent for "…" resulted in a network error
                     *   response: the promise was rejected.
                     *
                     * That is logged by the browser itself, from the service
                     * worker's scope — no `catch` in application code can reach
                     * it and no error handler can silence it.
                     *
                     * And it fires constantly during ordinary use, because two
                     * completely normal things take that path:
                     *
                     *   - **A cancelled request.** React Query aborts in-flight
                     *     queries when the component that owns them unmounts, so
                     *     every navigation away from a page that was still
                     *     loading aborts a handful of requests. Each abort is a
                     *     throw inside the handler, on a URL that has usually
                     *     never been cached.
                     *   - **A slow one.** `networkTimeoutSeconds` makes the
                     *     handler give up on the cache's behalf after six
                     *     seconds. On a first-ever call to an endpoint there is
                     *     nothing cached to give up *to*, so a request that is
                     *     merely slow — and that goes on to succeed — leaves an
                     *     error in the console behind it.
                     *
                     * In both cases the application is fine: axios sees a failed
                     * request, the query retries or reports, and the user
                     * notices nothing. The only casualty is the console, which
                     * fills with red for a page that is working.
                     *
                     * ## Why a 504
                     *
                     * `handlerDidError` has to return a `Response` for the
                     * `FetchEvent` to resolve normally, and the status is what
                     * the page will see. 504 is the honest one — the worker
                     * reached neither the network nor a cached copy — and the
                     * client already has wording for it: `errorMessage` maps 504
                     * to `session.slowStart`, which says the server is waking
                     * up. An opaque `Response.error()` would be a network error
                     * again and would change nothing.
                     *
                     * This must stay self-contained: `generateSW` stringifies it
                     * into `sw.js`, so it cannot close over anything in this
                     * file.
                     */
                    handlerDidError: async () =>
                      new Response(
                        JSON.stringify({
                          statusCode: 504,
                          message: 'The application could not reach the server.',
                        }),
                        {
                          status: 504,
                          statusText: 'Gateway Timeout',
                          headers: {
                            'Content-Type': 'application/json',
                            /*
                             * The marker that says this never reached the
                             * server, and it is load-bearing.
                             *
                             * `client.ts` times requests differently depending
                             * on whether the API has answered recently — a warm
                             * container gets a short timeout, a cold one a long
                             * one — and it decides that by noticing any
                             * response at all. A synthetic 504 looks like one,
                             * so without this header a worker that could not
                             * reach a *sleeping* server would mark it warm and
                             * the next real call would be given the short
                             * timeout and fail. See `SW_SYNTHETIC_HEADER`.
                             */
                            'X-Served-By': 'task-studio-sw',
                          },
                        },
                      ),
                  },
                ],
              },
            },
            {
              /*
               * The 3D and shader chunks, cached the first time they are
               * actually wanted.
               *
               * `CacheFirst` because a hashed asset is immutable by
               * construction — a new build produces a new filename, so there is
               * never a reason to revalidate one. A small `maxEntries` keeps a
               * few builds' worth and evicts the rest; these are megabytes
               * each, and a reader who has been through six deploys does not
               * need six copies of `three`.
               */
              urlPattern: ({ url }) => /\/(webgl|shaders)-[\w-]+\.js$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'task-studio-webgl',
                expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
          /*
           * Chunking by path, not by package name.
           *
           * ## Why the object form had to go
           *
           * `manualChunks: { webgl: ['three', '@react-three/fiber'], … }` reads
           * as "put these packages in this chunk", and that is not what it
           * does: Rollup assigns every module *reachable* from those entry
           * points, which includes their shared transitive dependencies. Both
           * `scheduler` and `zustand` are dependencies of `@react-three/fiber`
           * and of this application, so both were resolved into `webgl` — and
           * the entry chunk then carried a static
           * `import { … } from "./webgl-….js"` to get them back.
           *
           * A static import in the entry is not a lazy chunk. Vite wrote a
           * `modulepreload` for it into `index.html`, so every visitor to every
           * page fetched 870 kB of three.js before the first paint, for three
           * decorative surfaces on one marketing page that most of them never
           * trigger. Every `lazy()` boundary and device check in the landing
           * page was being undone by four lines of build configuration.
           *
           * ## What the function form guarantees
           *
           * A module goes to `webgl` or `shaders` only if it *is* one of those
           * packages. Anything shared falls through to the branches below or to
           * Rollup's own defaults, so a dependency that both halves of the
           * application use can never be trapped behind the 3D chunk. Adding a
           * package to `webgl` or `shaders` is now a local statement rather
           * than a claim over its whole dependency tree.
           *
           * The 3D and shader branches are tested first for the same reason:
           * `@react-three/fiber` contains the substring `react`, and an
           * unordered test would put it in the entry's own React chunk.
           *
           * The check to run after touching any of this: build, then
           * `grep 'from"./webgl-' dist/assets/index-*.js`. It must find nothing.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            // Windows and POSIX separators both, because this runs on both.
            const inPackage = (...names: string[]): boolean =>
              names.some((name) =>
                new RegExp(`[\\\\/]node_modules[\\\\/]${name}[\\\\/]`).test(id),
              );

            // The 3D stack. Only ever loaded by the landing page, and only
            // after `useCanvasBudget` has agreed to it.
            if (inPackage('three', '@react-three')) return 'webgl';
            if (inPackage('@shadergradient', '@paper-design')) return 'shaders';

            if (inPackage('react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler')) {
              return 'react';
            }
            if (inPackage('framer-motion', 'motion-dom', 'motion-utils')) return 'motion';
            if (inPackage('@dnd-kit')) return 'dnd';
            if (inPackage('@tanstack', 'axios', 'socket\\.io-client', 'zustand')) return 'data';

            return undefined;
          },
        },
      },
    },
  };
});

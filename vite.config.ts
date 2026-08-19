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
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
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

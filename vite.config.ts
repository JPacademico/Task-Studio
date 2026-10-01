import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Refuse to produce a production bundle that points at nothing. `import.meta.env.VITE_*` is
 * substituted at build time, not read at runtime.
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

/** The production Content-Security-Policy, so `vite preview` behaves like the deployed site. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // `http://localhost:*` and `ws://localhost:*` are the one deliberate difference from
  // `vercel.json`, and they are added *here* rather than there so production never carries them.
  "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // The text board's PDF preview, and nothing else. There was no `frame-src` at all, so framing
  // fell through to `default-src 'self'` and the preview was blocked.
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
          // The WebGL chunks are cached on demand, never precached. Precaching downloads every
          // listed file on the first visit.
          globIgnores: ['**/webgl-*.js', '**/shaders-*.js', '**/fonts/volcano/**'],
          // SPA fallback so a deep link opens offline from the app shell.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // API responses: try the network, fall back to cache offline. `pathname` rather than
              // the full URL because the API is a different origin in production.
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
                    // Answer with a response instead of rejecting, and this is the fix for a
                    // console full of errors in a working app.
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
                            // The marker that says this never reached the server, and it is
                            // load-bearing.
                            'X-Served-By': 'task-studio-sw',
                          },
                        },
                      ),
                  },
                ],
              },
            },
            {
              // The 3D and shader chunks, cached the first time they are actually wanted.
              // `CacheFirst` because a hashed asset is immutable by construction.
              urlPattern: ({ url }) => /\/(webgl|shaders)-[\w-]+\.js$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'task-studio-webgl',
                expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // The Volcano face, cached on first use.
              urlPattern: ({ url }) => url.pathname.startsWith('/fonts/volcano/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'task-studio-fonts',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
    // `npm run preview` serves the built app under the real policy. Deliberately not applied to
    // `server` (the dev server).
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
          // Chunking by path, not by package name. `manualChunks: { webgl: ['three',
          // '@react-three/fiber'], … }` reads as "put these packages in this chunk".
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

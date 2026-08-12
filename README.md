# Task Studio — PWA

React 19 + Vite installable PWA, organised with **Feature-Sliced Design**.
Tailwind for styling, Framer Motion for motion, `@dnd-kit` for the task board,
TanStack Query for server state, Zustand for session state, Sonner for toasts.

```
src/
├── app/              # composition root: providers, router, layout, global CSS
│   ├── providers/    # query → session → theme → realtime (order matters)
│   ├── router/       # routes + ProtectedRoute / GuestRoute
│   ├── layouts/      # AppLayout (hidden menus + animated outlet)
│   └── styles/       # theme tokens and component primitives
├── pages/            # routable screens (auth, dashboard, project, tasks, notes, bin, settings)
├── widgets/          # self-contained blocks: hidden-sidebar, top-navigation,
│                     # project-chat, whiteboard, project-dashboard
├── features/         # user actions: auth, task-management, dnd-board, roster,
│                     # ai-suggestions, notifications, theme-toggle, project-management
├── entities/         # domain models: user, project, task, note, chat, notification
│                     # each with model/ (types + query hooks), api/, ui/
└── shared/           # domain-agnostic: api client, socket, config, lib, UI kit
```

The dependency rule points one way only: `app → pages → widgets → features →
entities → shared`. A slice never imports from a layer above it, which is what
keeps a screen deletable without breaking the rest.

## Quick start

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

The app expects the API at `VITE_API_URL` (default
`http://localhost:3333/api/v1`). Only `VITE_*` variables reach the browser — they
are compiled into the bundle, so nothing secret belongs there.

## Interaction design

**Hidden edge menus.** `useEdgeReveal` watches a passive `pointermove` listener,
defers to `requestAnimationFrame`, and animates a fixed-position panel with a
single `transform`. Hysteresis (open within 22px, close at 300px) stops the
flicker you get from a naive threshold. Touch devices get a normal drawer instead,
because hover does not exist there.

**Drag & drop, two tools for two jobs.** `@dnd-kit/core` drives the task board,
where cards have droppable targets and need keyboard/touch sensors. Free-floating
objects — Post-it notes and the chat window — use Framer Motion motion values,
so dragging mutates a transform without a single React re-render. Pushing those
through a droppable-oriented library would cost renders and buy nothing.

**60fps rules the codebase.** Only `transform` and `opacity` are animated;
anything that moves carries the `.gpu` class (`translateZ(0)` +
`will-change`); the whiteboard draws imperatively into a canvas with the
in-progress stroke in a ref; note positions and whiteboard strokes are written
once per gesture, never per frame.

**Theme.** Every colour is a CSS variable, so light/dark is one class toggle on
`<html>` — no re-render, no repaint cascade. An inline script in `index.html`
applies the stored preference before first paint to prevent a flash, and the
choice is mirrored to the user's profile so it follows them across devices.

**Optimistic where it matters.** Status changes, pins and note edits update the
cache first and roll back on error. Creates and deletes wait for the server,
because their identity comes from it.

## PWA

`vite-plugin-pwa` (Workbox) generates the manifest and service worker:
`NetworkFirst` for `/api/` (so a cold PWA still shows the last board offline),
`CacheFirst` for R2 media, and an app-shell fallback for deep links.

iOS/Safari specifics that are easy to get wrong and are handled here:
`apple-mobile-web-app-capable`, a real `apple-touch-icon.png`,
`viewport-fit=cover` plus `env(safe-area-inset-*)` padding, and a
`black-translucent` status bar.

Icons are generated from code — no binary assets in the repo:

```bash
npm run icons
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (honours `PORT`) |
| `npm run build` | Typecheck (`tsc -b`) then production build |
| `npm run preview` | Serve the built bundle — the only way to exercise the service worker |
| `npm run typecheck` | Project-references typecheck |
| `npm run icons` | Regenerate PWA icons |

## Deploying to Vercel

Import the repository; `vercel.json` sets the framework, the SPA rewrite and
cache headers (immutable for `/assets`, `must-revalidate` for `sw.js` so updates
land). Set `VITE_API_URL` and `VITE_SOCKET_URL` in the project's environment,
then add the deployment origin to `CORS_ORIGINS` on the API.

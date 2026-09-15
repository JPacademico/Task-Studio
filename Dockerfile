# Task Studio PWA — a static build, served by nginx.
#
# ## What this is for, given that the app deploys to Vercel
#
# Vercel is the primary target and nothing here changes that. This exists for
# the three cases Vercel does not cover:
#
#   - **Self-hosting.** Putting the frontend on the same droplet as the API,
#     which is one `docker compose up` and removes the third-party dependency
#     entirely.
#   - **A preview that matches production.** `npm run preview` serves the build
#     with none of the headers a real deployment sends; this serves it with all
#     of them, which is how you catch a CSP that breaks something before it is
#     deployed rather than after.
#   - **Not being locked in.** The frontend is a directory of static files. Any
#     host that can serve one will do, and this proves it.
#
# ## The thing that makes this different from the API's Dockerfile
#
# **Vite inlines `VITE_*` at build time.** They are not read at runtime — there
# is no process to read them — so `import.meta.env.VITE_API_URL` becomes a
# literal string in the bundle when `npm run build` runs. See the long note in
# `src/shared/config/env.ts`.
#
# The consequence: this image is built *for one API*. Passing the URL as a
# runtime `-e` does nothing at all, which is the single most confusing way this
# can be got wrong — the container starts, the page loads, and every request
# goes to whatever address was baked in at build time. So they are `ARG`s, and
# the build fails without them.
#
#   docker build \
#     --build-arg VITE_API_URL=https://api.your-domain.com/api/v1 \
#     --build-arg VITE_SOCKET_URL=https://api.your-domain.com \
#     -t task-studio-ui .

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Cached on the lockfile alone, so a source-only change does not reinstall.
COPY package*.json ./
RUN npm ci

COPY . .

# Where the API lives. No defaults on purpose.
#
# A default would be a localhost address baked into a production bundle —
# which loads perfectly, renders every screen, and fails on the first request
# against a machine the visitor's browser is happy to try and which is, for
# them, simply not running a server. `vite.config.ts` refuses the build when
# `VITE_API_URL` is missing, and that refusal is the feature.
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ---------------------------------------------------------------------------
# 2. Serve
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Everything the SPA needs: the history fallback, the cache rules, and the
# security headers that keep this image honest against what Vercel sends. See
# `deploy/nginx.conf`.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx's own default config is still at /etc/nginx/nginx.conf and still
# declares `user nginx;`, so the master starts as root, binds, and drops to the
# unprivileged user for the workers. That is the image's intended design; what
# it means here is that port 80 inside the container is fine and no capability
# juggling is needed.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

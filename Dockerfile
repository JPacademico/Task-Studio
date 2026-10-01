# Task Studio PWA — a static build, served by nginx. Vercel is the primary target and nothing here
# changes that.

# --- 1. Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Cached on the lockfile alone, so a source-only change does not reinstall.
COPY package*.json ./
RUN npm ci

COPY . .

# Where the API lives. No defaults on purpose. A default would be a localhost address baked into a
# production bundle — which loads perfectly, renders every screen.
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# --- 2. Serve ---
FROM nginx:1.27-alpine AS runner

# Everything the SPA needs: the history fallback, the cache rules, and the security headers that
# keep this image honest against what Vercel sends.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx's own default config is still at /etc/nginx/nginx.conf and still declares `user nginx;`, so
# the master starts as root, binds, and drops to the unprivileged user for the workers.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/shared/config/env';
import { translate } from '@/shared/i18n';
import { tokenStore } from './token-store';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/** Listeners notified when the session is definitively gone. */
const sessionExpiredHandlers = new Set<() => void>();

export const onSessionExpired = (handler: () => void): (() => void) => {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
};

const notifySessionExpired = (): void => {
  tokenStore.clear();
  sessionExpiredHandlers.forEach((handler) => handler());
};

/*
 * Two timeouts, because the API has two very different resting states.
 *
 * Render's free plan stops the container after a stretch of no traffic. The
 * next request does not fail — the edge accepts it, starts the container, and
 * *holds the connection* through a cold Node boot plus a Prisma connect
 * against a Neon instance that has very likely autosuspended as well. Measured
 * end to end that is tens of seconds, and it is the normal path for the first
 * visitor of the morning, not an error case.
 *
 * A single 20s ceiling therefore guarantees that first request aborts, and
 * aborts in the way that is hardest to read: the app reports the server as
 * unreachable at the exact moment the server is busy waking up for it. The
 * user retries, the container is now warm, and it works — which makes the
 * whole thing look intermittent rather than mechanical.
 *
 * Raising the ceiling for *every* request is the other wrong answer. Once the
 * container is up a request that has not answered in 20s is not slow, it is
 * broken, and making people wait a minute to be told so is worse than telling
 * them promptly.
 *
 * So the ceiling depends on whether we have recent evidence the container is
 * awake: any response at all — including a 4xx, which proves just as much as a
 * 200 — marks it warm for `WARM_TTL_MS`, which sits under the platform's idle
 * threshold so the window closes before the container actually goes down.
 * Nothing is ever retried: a cold start is a slow success, and re-sending a
 * POST that the edge is still holding is how one sign-up becomes two.
 */
const WARM_TIMEOUT_MS = 20_000;
const COLD_TIMEOUT_MS = 60_000;
const WARM_TTL_MS = 10 * 60_000;

/**
 * The ceiling for a route that is slow because of what it does, not because of
 * where it is hosted.
 *
 * Generating suggestions is a call to a language model with a cold-start and a
 * retry of its own behind it. Twenty seconds is the right verdict for a CRUD
 * endpoint that has gone quiet and completely the wrong one here, where a
 * perfectly healthy request routinely takes longer than that — which is why
 * the assistant "failed because of a timeout" while the server was still
 * working on an answer it would then throw away.
 *
 * The API bounds each of its own attempts well inside this, so in practice the
 * server is what decides, and it can say something specific about why.
 */
export const SLOW_ROUTE_TIMEOUT_MS = 90_000;

let lastResponseAt = 0;

/**
 * Whether the unauthenticated `/health` probe has ever come back.
 *
 * This exists to tell two indistinguishable failures apart. Axios reports both
 * "the host is unreachable" and "the browser refused to hand you the response"
 * as `ERR_NETWORK` with no status and no body — by design, because a
 * cross-origin rejection is not allowed to leak what happened. So the client
 * cannot ask the failed request what went wrong.
 *
 * What it *can* do is remember whether the very same origin answered a moment
 * ago. If `/health` succeeded and a normal call then fails at the network
 * layer, the server is up and something in front of it said no — a missing CORS
 * origin on the deployment, a blocking extension, a corporate proxy. That is a
 * completely different thing to tell somebody than "check your connection", and
 * on a first visit to a fresh deployment it is overwhelmingly the likely one.
 */
let healthProbeSucceeded = false;

const apiIsWarm = (): boolean => Date.now() - lastResponseAt < WARM_TTL_MS;

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: COLD_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  /*
   * The warm/cold ceiling is a *default*, not an override.
   *
   * This line used to assign unconditionally, which quietly threw away any
   * timeout a caller had passed — the value was set on the request config and
   * then overwritten here before the request left. Nothing failed loudly; the
   * per-route ceiling simply had no effect, and the one route that needed a
   * longer one (the assistant) kept aborting at twenty seconds.
   *
   * `axios.create` seeds every config with the instance default, so "did the
   * caller ask for something?" is "is it different from that default?".
   */
  const explicit = config.timeout !== undefined && config.timeout !== COLD_TIMEOUT_MS;
  if (!explicit) config.timeout = apiIsWarm() ? WARM_TIMEOUT_MS : COLD_TIMEOUT_MS;

  return config;
});

/**
 * Start the container booting before anyone needs it.
 *
 * The auth screens are where a cold start is most expensive: it is the first
 * request of the session by definition, and the person waiting on it has no
 * reason yet to believe the app works at all. But it is also where the dead
 * time is free — between the login form appearing and a password being typed
 * there are several seconds in which the boot can happen unobserved.
 *
 * Deliberately unauthenticated, deliberately ignoring its own result, and
 * pointed at `/health` (which sits outside the `api/v1` prefix and touches the
 * database, so it wakes Neon too). Failure is not worth reporting: the real
 * request behind it will produce a real error message of its own.
 */
export const wakeApi = (): void => {
  if (apiIsWarm()) return;

  const origin = env.apiUrl.replace(/\/api\/v\d+$/, '');
  void axios
    .get(`${origin}/health`, { timeout: COLD_TIMEOUT_MS })
    .then(() => {
      lastResponseAt = Date.now();
      healthProbeSucceeded = true;
    })
    .catch(() => undefined);
};

/**
 * The endpoints where a 401 means "those credentials are wrong", not
 * "your session has ended".
 *
 * Everything under `/auth/` that a signed-*out* visitor calls answers 401 as
 * its ordinary failure: a wrong password, an expired reset link, a spent OAuth
 * code. Sending those through the refresh-and-retry path below is wrong twice
 * over — there is no session to refresh, so the refresh fails immediately, and
 * the failure is then reported to the user as "Your session expired, sign in
 * again" on the very screen they are trying to sign in *from*. That message is
 * confusing after a mistyped password and actively misleading in a browser
 * that has never held a session at all.
 *
 * `/auth/me` and `/auth/change-password` are deliberately not here: those are
 * called *with* a session, and a 401 from them is exactly the case the retry
 * below exists for.
 */
const SIGN_IN_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/oauth/',
];

const isSignInCall = (url: string | undefined): boolean =>
  Boolean(url && SIGN_IN_PATHS.some((path) => url.includes(path)));

/**
 * Single in-flight refresh shared by every waiting request: a burst of 401s
 * after a cold start must not fire N refreshes and invalidate the token family.
 */
let refreshPromise: Promise<string> | null = null;

const refreshSession = async (): Promise<string> => {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  // Bare axios: the instance interceptor would attach the dead access token.
  const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${env.apiUrl}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  tokenStore.set(data);
  return data.accessToken;
};

api.interceptors.response.use(
  (response) => {
    lastResponseAt = Date.now();
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // A rejection that carries a response still proves the container answered.
    if (error.response) lastResponseAt = Date.now();

    if (status !== 401 || !config || config._retried || isSignInCall(config.url)) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;

      config.headers.Authorization = `Bearer ${token}`;
      return api.request(config);
    } catch {
      notifySessionExpired();
      return Promise.reject(error);
    }
  },
);

/** Turns any axios failure into a message worth showing in a toast. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const message = payload?.message;

    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === 'string') return message;

    /*
     * These two look identical to a user and mean opposite things, so they say
     * different things. `ERR_NETWORK` is no connection at all — their network,
     * or a misconfigured API address. `ECONNABORTED` is our own timeout firing
     * against a server that accepted the connection, which on this hosting is
     * overwhelmingly a container still starting up.
     */
    if (error.code === 'ERR_NETWORK') {
      /*
       * The API answered `/health` but refused this one, so the network is
       * fine and the request never left the browser intact. Naming the origin
       * is what makes this actionable: nine times out of ten the fix is adding
       * this site's URL to `CORS_ORIGINS` on the API.
       */
      if (healthProbeSucceeded) {
        console.error(
          `[task-studio] Reached ${env.apiUrl} for /health but the request above was blocked. ` +
            `If this is a deployment, check that CORS_ORIGINS on the API includes ${window.location.origin}.`,
        );
        return translate('session.blocked');
      }

      return 'Cannot reach the server. Check your connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'The server is taking too long to respond — it may be starting up. Try again in a moment.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

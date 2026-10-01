import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/shared/config/env';
import { translate, type TranslationKey } from '@/shared/i18n';
import { CLIENT_ID, CLIENT_ID_HEADER } from './client-id';
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

// Two timeouts, because the API has two very different resting states. Render's free plan stops the
// container after a stretch of no traffic.
const WARM_TIMEOUT_MS = 20_000;
const COLD_TIMEOUT_MS = 60_000;
const WARM_TTL_MS = 10 * 60_000;

/**
 * The ceiling for a route that is slow because of what it does, not because of where it is hosted.
 */
export const SLOW_ROUTE_TIMEOUT_MS = 90_000;

let lastResponseAt = 0;

/**
 * Whether the unauthenticated `/health` probe has ever come back. This exists to tell two
 * indistinguishable failures apart.
 */
let healthProbeSucceeded = false;

const apiIsWarm = (): boolean => Date.now() - lastResponseAt < WARM_TTL_MS;

/**
 * The header the service worker stamps on a response it invented. Only ever set by the
 * `handlerDidError` plugin in `vite.config.ts`; the API never sends it.
 */
const SW_SYNTHETIC_HEADER = 'x-served-by';
const SW_SYNTHETIC_VALUE = 'task-studio-sw';

const isServiceWorkerFallback = (response: { headers?: unknown }): boolean => {
  const headers = response.headers as Record<string, unknown> | undefined;
  return headers?.[SW_SYNTHETIC_HEADER] === SW_SYNTHETIC_VALUE;
};

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: COLD_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Who is asking, for the benefit of the answer nobody asked for. The API stamps this onto every
  // realtime event a request causes.
  config.headers[CLIENT_ID_HEADER] = CLIENT_ID;

  // The warm/cold ceiling is a *default*, not an override. This line used to assign
  // unconditionally, which quietly threw away any timeout a caller had passed.
  const explicit = config.timeout !== undefined && config.timeout !== COLD_TIMEOUT_MS;
  if (!explicit) config.timeout = apiIsWarm() ? WARM_TIMEOUT_MS : COLD_TIMEOUT_MS;

  return config;
});

/**
 * Start the container booting before anyone needs it. The auth screens are where a cold start is
 * most expensive: it is the first request of the session by definition.
 */
export const wakeApi = (): void => {
  void ensureApiAwake();
};

/** Whether the container has answered recently enough to be trusted awake. */
export const isApiWarm = (): boolean => apiIsWarm();

/**
 * The same boot, but awaitable — and shared. `wakeApi` is fire-and-forget because nothing was ever
 * waiting on it.
 */
let wakeInFlight: Promise<boolean> | null = null;

export const ensureApiAwake = (): Promise<boolean> => {
  if (apiIsWarm()) return Promise.resolve(true);
  if (wakeInFlight) return wakeInFlight;

  const origin = env.apiUrl.replace(/\/api\/v\d+$/, '');

  // Probes in sequence rather than one long request. A cold boot does not fail — the edge holds the
  // connection open — so a single 60s GET usually is enough.
  wakeInFlight = (async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await axios.get(`${origin}/health`, { timeout: COLD_TIMEOUT_MS });
        lastResponseAt = Date.now();
        healthProbeSucceeded = true;
        return true;
      } catch {
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
    }

    return false;
  })().finally(() => {
    wakeInFlight = null;
  });

  return wakeInFlight;
};

/**
 * The endpoints where a 401 means "those credentials are wrong", not "your session has ended".
 * Everything under `/auth/` that a signed-*out* visitor calls answers 401 as its ordinary failure.
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
  // And logging *out*, which belongs here for the mirror-image reason. Sign-out stops waiting on
  // the revoke after a couple of seconds and clears the session locally — see `useSignOut`.
  '/auth/logout',
];

const isSignInCall = (url: string | undefined): boolean =>
  Boolean(url && SIGN_IN_PATHS.some((path) => url.includes(path)));

/**
 * The API's marker for "this account has been suspended". A code on the payload, not a substring of
 * the message — the message is user-facing prose that will be reworded.
 */
const SUSPENDED_CODE = 'ACCOUNT_SUSPENDED';

const isSuspended = (error: AxiosError): boolean =>
  (error.response?.data as { code?: string } | undefined)?.code === SUSPENDED_CODE;

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

/**
 * A fresh access token, shared with whoever else is asking. Exported because the socket needs one
 * too.
 */
export const refreshAccessToken = (): Promise<string> => {
  refreshPromise ??= refreshSession().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => {
    lastResponseAt = Date.now();
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // A rejection that carries a response usually proves the container answered — unless the
    // service worker wrote the response itself.
    if (error.response && !isServiceWorkerFallback(error.response)) {
      lastResponseAt = Date.now();
    }

    // A suspended account is not a session to renew — it is one to end. The API marks this 403 with
    // a code rather than leaving it to be told apart from every other refusal by its wording.
    if (status === 403 && isSuspended(error)) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    if (status !== 401 || !config || config._retried || isSignInCall(config.url)) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      const token = await refreshAccessToken();

      config.headers.Authorization = `Bearer ${token}`;
      return api.request(config);
    } catch {
      notifySessionExpired();
      return Promise.reject(error);
    }
  },
);

// --- Turning a failure into a sentence a person can act on. ---

/**
 * Message shapes that come from a machine. Anchored wherever the shape allows it, so that a
 * sentence merely *containing* one of these words is not caught by it.
 */
const MACHINE_MESSAGE: RegExp[] = [
  // class-validator, which is the bulk of them.
  /\b(must be|must not be|must contain|must match|must be a|must be an|must be one of|must be longer|must be shorter|must be a valid)\b/i,
  /\bshould not (exist|be empty)\b/i,
  /\bis not a valid (enum|uuid|url|iso|boolean|number|integer|date)\b/i,
  /^property \S+ should not exist$/i,
  // Nest's defaults: a status code spelled out as a word.
  /^(unauthorized|forbidden(\s+resource)?|not found|bad request|conflict|unprocessable entity|payload too large|too many requests|internal server error|bad gateway|service unavailable|gateway timeout)\.?$/i,
  // Axios, and the runtime underneath it.
  /^request failed with status code \d+$/i,
  /^network error$/i,
  /^timeout of \d+\s*ms exceeded$/i,
  /^(canceled|cancelled|aborted)$/i,
  /^(ECONN\w*|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|EPIPE|EHOSTUNREACH|ERR_[A-Z_]+)\b/,
  /^socket hang up$/i,
  /^fetch failed$/i,
  // A route that does not exist answers in Express's voice.
  /^cannot (get|post|put|patch|delete|head|options)\s/i,
  // Prisma's unique-constraint message, once it starts naming columns. The API composes it from the
  // constraint's `target`.
  /\bwith that [^.]*(?:[A-Za-z]Id|_id|\bid)\b/,
  // Anything that is obviously not a sentence.
  /^\[object\s/i,
  /^[A-Za-z]*Error:\s/,
  /\bat\s+\S+\s+\(.*:\d+:\d+\)/,
];

/**
 * Is this worth showing to the person who pressed the button? The length ceiling catches serialised
 * objects and stack traces that got past the patterns.
 */
const isReadable = (message: string): boolean => {
  const text = message.trim();

  if (text.length === 0 || text.length > 240) return false;
  if (!/\s/.test(text)) return false;
  if (/[{}<>]|\n\s*at\s/.test(text)) return false;

  return !MACHINE_MESSAGE.some((pattern) => pattern.test(text));
};

/**
 * What each status means, in the product's own voice. Only the ones a reader can do something about
 * are given their own sentence.
 */
const STATUS_MESSAGE: Record<number, TranslationKey> = {
  400: 'error.badRequest',
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  409: 'error.conflict',
  413: 'error.tooLarge',
  422: 'error.invalid',
  429: 'error.tooMany',
  500: 'error.server',
  502: 'error.server',
  503: 'error.unavailable',
  // Ours timed out against a server that did answer - almost always a cold
  // container on this hosting, which is what `slowStart` says.
  504: 'session.slowStart',
};

/** Turns any axios failure into a message worth showing in a toast. */
export const errorMessage = (
  error: unknown,
  fallback = translate('common.somethingWentWrong'),
): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const raw = payload?.message;
    // An array is a validation failure - Nest sends one entry per broken rule. Only the first was
    // ever shown, which was already a half-truth.
    const message = Array.isArray(raw) ? raw[0] : raw;

    if (typeof message === 'string' && isReadable(message)) return message;

    // These two look identical to a user and mean opposite things, so they say different things.
    // `ERR_NETWORK` is no connection at all - their network, or a misconfigured API address.
    if (error.code === 'ERR_NETWORK') {
      // The API answered `/health` but refused this one, so the network is fine and the request
      // never left the browser intact.
      if (healthProbeSucceeded) {
        console.error(
          `[task-studio] Reached ${env.apiUrl} for /health but the request above was blocked. ` +
            `If this is a deployment, check that CORS_ORIGINS on the API includes ${window.location.origin}.`,
        );
        return translate('session.blocked');
      }

      return translate('session.unreachable');
    }
    if (error.code === 'ECONNABORTED') {
      return translate('session.slowStart');
    }

    const status = error.response?.status;
    if (status) {
      const known = STATUS_MESSAGE[status];
      if (known) return translate(known);
      // Any other 5xx is still our fault and still not theirs to fix.
      if (status >= 500) return translate('error.server');
    }

    return fallback;
  }

  // A thrown `Error` that is not an axios one - a parse failure, a guard in our own code, a
  // rejected file read.
  if (error instanceof Error && error.message && isReadable(error.message)) {
    return error.message;
  }

  return fallback;
};

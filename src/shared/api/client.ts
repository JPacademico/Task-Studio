import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/shared/config/env';
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

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isRefreshCall = config?.url?.includes('/auth/refresh');
    if (status !== 401 || !config || config._retried || isRefreshCall) {
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
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

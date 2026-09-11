import { api } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import type { AuthSession, CurrentUser } from '@/entities/user/model/types';

/** The providers the sign-in screen can offer, if the API has keys for them. */
export type OAuthProvider = 'google' | 'github';

export type OAuthAvailability = Record<OAuthProvider, boolean>;

/** What the API says about the human check, or `null` if it asks for none. */
export interface BotProtectionConfig {
  provider: 'turnstile';
  siteKey: string;
}

/** The Turnstile token, on the requests that carry one. */
interface HumanChecked {
  captchaToken?: string;
}

export const authApi = {
  async register(
    payload: {
      email: string;
      password: string;
      displayName: string;
    } & HumanChecked,
  ): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/register', payload);
    return data;
  },

  async login(payload: { email: string; password: string } & HumanChecked): Promise<AuthSession> {
    const { data } = await api.post<AuthSession>('/auth/login', payload);
    return data;
  },

  /** Confirming the email also returns a session, so the user lands signed in. */
  async verifyEmail(token: string): Promise<AuthSession> {
    const { data } = await api.post<AuthSession>('/auth/verify-email', { token });
    return data;
  },

  async resendVerification(email: string, captchaToken?: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/resend-verification', {
      email,
      captchaToken,
    });
    return data;
  },

  async forgotPassword(email: string, captchaToken?: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
      email,
      captchaToken,
    });
    return data;
  },

  async resetPassword(payload: { token: string; password: string }) {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', payload);
    return data;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    const { data } = await api.post<{ message: string }>('/auth/change-password', payload);
    return data;
  },

  async me(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>('/auth/me');
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  // --- Signing in with a provider -------------------------------------------

  /**
   * Which buttons to draw.
   *
   * Asked rather than assumed: the keys live on the API, and a button that
   * leads to a 503 is worse than no button. A failed request is read as "no
   * providers", so an API that has not been redeployed with these endpoints
   * yet simply shows the ordinary form.
   */
  /**
   * Whether the sign-in forms should render a human check, and with which key.
   *
   * Asked rather than built in, for the reason in `HumanCheck`: the site key
   * and the API's secret are checked against each other, so a copy carried in
   * this bundle can go stale against the deployment it is talking to. A failure
   * is read as "no check" — the throttler and the account lockout are the
   * layers this one sits on top of, and neither depends on it.
   */
  async botProtection(): Promise<BotProtectionConfig | null> {
    try {
      const { data } = await api.get<BotProtectionConfig | null>('/auth/bot-protection');
      return data;
    } catch {
      return null;
    }
  },

  async oauthProviders(): Promise<OAuthAvailability> {
    const { data } = await api.get<OAuthAvailability>('/auth/oauth/providers');
    return data;
  },

  /**
   * Where to send the browser to start a provider sign-in.
   *
   * A full page navigation, not a request: the provider's consent screen is a
   * website the user has to look at, and it sets cookies on its own origin that
   * no `fetch` from here could carry. Built off `env.apiUrl` because it is the
   * API — not the SPA — that owns the redirect and holds the client secret.
   */
  oauthStartUrl(provider: OAuthProvider): string {
    return `${env.apiUrl}/auth/oauth/${provider}`;
  },

  /** Trades the one-time code from the callback URL for a real session. */
  async exchangeOAuthCode(code: string): Promise<AuthSession> {
    const { data } = await api.post<AuthSession>('/auth/oauth/exchange', { code });
    return data;
  },
};

import { api } from '@/shared/api/client';
import type { AuthSession, CurrentUser } from '@/entities/user/model/types';

export const authApi = {
  async register(payload: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/register', payload);
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<AuthSession> {
    const { data } = await api.post<AuthSession>('/auth/login', payload);
    return data;
  },

  /** Confirming the email also returns a session, so the user lands signed in. */
  async verifyEmail(token: string): Promise<AuthSession> {
    const { data } = await api.post<AuthSession>('/auth/verify-email', { token });
    return data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
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
};

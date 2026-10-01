import { api } from '@/shared/api/client';

/**
 * What the approval screen is told about the terminal asking to come in. Everything here is shown
 * and none of it is trusted.
 */
export interface CliDeviceRequest {
  userCode: string;
  deviceName: string | null;
  ipAddress: string | null;
  requestedAt: string;
  expiresAt: string;
}

/**
 * The browser's half of signing a terminal in. The terminal never sends a password anywhere in this
 * flow — it asks for a code, prints it, and waits.
 */
export const cliDeviceApi = {
  async describe(userCode: string): Promise<CliDeviceRequest> {
    const { data } = await api.get<CliDeviceRequest>(
      `/cli/auth/device/${encodeURIComponent(userCode)}`,
    );
    return data;
  },

  async approve(userCode: string): Promise<void> {
    await api.post(`/cli/auth/device/${encodeURIComponent(userCode)}/approve`);
  },

  async deny(userCode: string): Promise<void> {
    await api.post(`/cli/auth/device/${encodeURIComponent(userCode)}/deny`);
  },
};

/** Upper-cased, with the spaces and dashes people type stripped. Matches the API. */
export const normaliseUserCode = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

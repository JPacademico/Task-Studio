/** A unique-enough id, on every browser and every origin. */
export const uid = (): string => {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));

    // Version 4, variant 1 — the two fields a UUID's shape actually promises.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // No crypto at all. See the note above on why this is acceptable for these
  // ids specifically, and would not be for anything else.
  const random = () => Math.random().toString(16).slice(2, 10);
  return `${random()}-${random()}-${random()}-${random()}`;
};

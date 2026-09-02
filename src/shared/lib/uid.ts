/**
 * A unique-enough id, on every browser and every origin.
 *
 * ## Why `crypto.randomUUID()` alone was a bug
 *
 * It is not available in an insecure context. `window.crypto` exists
 * everywhere, but the `SubtleCrypto`-adjacent members — `randomUUID` among them
 * — are gated on the page being a *secure context*, which means HTTPS or
 * `localhost` and nothing else. This app is self-hostable, and a self-hosted
 * deployment on plain HTTP over a LAN is an entirely ordinary way to run it.
 *
 * On such a deployment `crypto.randomUUID` is `undefined`, so the three places
 * that called it — creating a note, pinning an image, sending a chat message —
 * threw a `TypeError` at the moment of the write. Not a degraded feature: an
 * unhandled exception in an event handler, on the three most-used actions in
 * the product. The same is true on Safari before 15.4 regardless of origin.
 *
 * ## What the fallbacks are, and why they are safe here
 *
 * `getRandomValues` is *not* secure-context gated and is available everywhere
 * this app runs, so it is the first fallback and is cryptographically strong.
 * The last resort is `Math.random`, which is not — and does not need to be.
 *
 * Every id this function produces is a **client-side correlation key**: an
 * optimistic row's placeholder until the server answers, or the `clientId` a
 * chat message carries so the sender can recognise their own echo. None of them
 * is a credential, a token, or anything the server trusts — the server issues
 * its own ids and never accepts one of these as an identity. The only property
 * that matters is not colliding with another id in the same tab, and 122 bits
 * of `Math.random` clears that by an enormous margin.
 */
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

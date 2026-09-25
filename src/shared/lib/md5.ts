/**
 * MD5 of some bytes, as lowercase hex.
 *
 * ## Why MD5, of all things
 *
 * Not for anything to do with security — nothing here trusts it to resist a
 * collision. It is here because it is the fingerprint the *bucket* already
 * keeps: R2 reports the MD5 of every single-part upload as its ETag, so the API
 * can find a picture by it without ever reading or hashing a byte itself. The
 * client computing the same digest is what lets it ask "is this picture
 * already on the board?" *before* uploading it — and skip the upload when it
 * is. See `BoardFoldersService.lookup` on the API.
 *
 * Web Crypto deliberately offers no MD5, hence the few dozen lines below: the
 * RFC 1321 algorithm, over a `Uint8Array`, in one pass. A 1 MB WebP hashes in
 * a few milliseconds, which is noise next to the encode that produced it.
 */

/** Per-round left-rotation amounts. */
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** The sine table: floor(|sin(i + 1)| × 2³²), exact in double precision. */
const TABLE = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
);

export const md5 = (bytes: Uint8Array): string => {
  const length = bytes.length;
  // Message, a 0x80 byte, zero padding, then the bit length in 64 bits.
  const padded = (((length + 8) >>> 6) + 1) << 6;
  const buffer = new Uint8Array(padded);
  buffer.set(bytes);
  buffer[length] = 0x80;

  const view = new DataView(buffer.buffer);
  const bits = length * 8;
  view.setUint32(padded - 8, bits >>> 0, true);
  view.setUint32(padded - 4, Math.floor(bits / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < padded; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let round = 0; round < 64; round += 1) {
      let mixed: number;
      let word: number;

      if (round < 16) {
        mixed = (b & c) | (~b & d);
        word = round;
      } else if (round < 32) {
        mixed = (d & b) | (~d & c);
        word = (5 * round + 1) % 16;
      } else if (round < 48) {
        mixed = b ^ c ^ d;
        word = (3 * round + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        word = (7 * round) % 16;
      }

      mixed = (mixed + a + TABLE[round] + words[word]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((mixed << SHIFTS[round]) | (mixed >>> (32 - SHIFTS[round])))) >>> 0;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const digest = new DataView(new ArrayBuffer(16));
  digest.setUint32(0, a0, true);
  digest.setUint32(4, b0, true);
  digest.setUint32(8, c0, true);
  digest.setUint32(12, d0, true);

  let hex = '';
  for (let index = 0; index < 16; index += 1) {
    hex += digest.getUint8(index).toString(16).padStart(2, '0');
  }
  return hex;
};

/** The same, for a `Blob` — which is what an upload actually holds. */
export const md5OfBlob = async (blob: Blob): Promise<string> =>
  md5(new Uint8Array(await blob.arrayBuffer()));

import type { Currency, Limit } from '@/entities/billing/model/types';

/**
 * A plan's byte ceiling, said the way the plan says it.
 *
 * ## Why not `formatFileSize`
 *
 * The shared one is for *files* and is decimal — it divides by 1000, stops at
 * megabytes, and shows one decimal place. All three are right for "this PDF is
 * 2.4 MB" and wrong here. A gigabyte ceiling would render as "1073.7 MB",
 * which is the correct number of a unit nobody quoted, and a plan advertised at
 * "80 MB" has to *say* 80 MB rather than 83.9.
 *
 * So this divides by 1024, matching the catalogue that defines the ceilings,
 * and rounds to whole units — which reproduces exactly the figures the API puts
 * in its refusals. The two agreeing is the point: a gauge that reads 80 MB and
 * an error that says 83.9 MB are describing the same limit and will be read as
 * a bug.
 */
export const formatBytesCeiling = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${Math.round((mb / 1024) * 10) / 10} GB`;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Bytes somebody is *using*, which needs more resolution than a ceiling does.
 *
 * A gauge reading "0 MB" for a board holding four hundred kilobytes is not
 * wrong so much as useless, and the rounding that makes a ceiling read cleanly
 * is what causes it. One decimal below ten megabytes, none above — enough to
 * see the needle move early on, and no false precision once it matters.
 */
export const formatBytesUsed = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
};

/**
 * A price, in the reader's own conventions.
 *
 * `Intl.NumberFormat` rather than a template string with a symbol in front,
 * because the two currencies this app sells in genuinely disagree about
 * everything: `$5.00` and `R$ 20,00` differ in symbol, in separator, in
 * decimal mark and in whether there is a space. Hand-formatting would get one
 * of them right.
 *
 * The *locale* is the reader's, and the currency is the subscription's. That
 * pairing is deliberate: somebody reading the app in Portuguese who is billed
 * in dollars should see a dollar amount punctuated the way they read numbers,
 * not a dollar amount punctuated for somebody else.
 *
 * `minimumFractionDigits: 0` collapses `$5.00` to `$5` — every price in the
 * catalogue is a whole unit, and trailing zeroes on a marketing table are noise.
 */
export const formatPrice = (amount: number, currency: Currency, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);

/**
 * How full something is, as a fraction between 0 and 1.
 *
 * `null` for an unmetered limit rather than 0, because a gauge that showed
 * "empty" for something with no ceiling would be drawing a bar that can never
 * move. The caller renders nothing at all in that case.
 *
 * Clamped at 1: usage can legitimately exceed a ceiling — an account that was
 * downgraded holds more than its new plan allows — and a bar overflowing its
 * track is a rendering fault rather than a message.
 */
export const usageFraction = (used: number, limit: Limit): number | null =>
  limit === null || limit <= 0 ? null : Math.min(1, used / limit);

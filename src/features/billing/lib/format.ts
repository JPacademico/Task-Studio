import type { Currency, Limit } from '@/entities/billing/model/types';

/**
 * A plan's byte ceiling, said the way the plan says it. The shared one is for *files* and is
 * decimal — it divides by 1000, stops at megabytes, and shows one decimal place.
 */
export const formatBytesCeiling = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${Math.round((mb / 1024) * 10) / 10} GB`;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Bytes somebody is *using*, which needs more resolution than a ceiling does. A gauge reading "0
 * MB" for a board holding four hundred kilobytes is not wrong so much as useless.
 */
export const formatBytesUsed = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
};

/**
 * A price, in the reader's own conventions. `Intl.NumberFormat` rather than a template string with
 * a symbol in front.
 */
export const formatPrice = (amount: number, currency: Currency, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);

/**
 * How full something is, as a fraction between 0 and 1. `null` for an unmetered limit rather than
 * 0.
 */
export const usageFraction = (used: number, limit: Limit): number | null =>
  limit === null || limit <= 0 ? null : Math.min(1, used / limit);

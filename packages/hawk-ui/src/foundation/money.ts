/**
 * Money formatting — kobo-safe.
 *
 * Amounts cross the wire as **kobo** (integer minor units). Every helper here
 * takes kobo and never a float: `0.1 + 0.2 !== 0.3` is a rounding curiosity in
 * most products and a ledger discrepancy in this one.
 *
 * Wire values may arrive as `number` or `string` (large amounts are serialised
 * as strings to survive JSON), so the parser accepts both. See the API seam
 * notes — the backend is explicit that money is "number/string, never float".
 */

export const NAIRA = '₦';

/** The masked rendering. CONTRACTS §9. */
export const HAWK_MASK = `${NAIRA}••••••`;

export type HawkKobo = number | string;

/** Parse a wire amount into kobo. Returns 0 for anything unparseable. */
export function toKobo(value: HawkKobo | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface HawkMoneyOptions {
  /** Show the ₦ sign. Defaults to true. */
  symbol?: boolean;
  /**
   * Show kobo. Defaults to false.
   *
   * Nigerian retail prices are whole naira in practice, and a wallet balance
   * reading `₦8,420.00` spends two characters of the most valuable slot on
   * screen saying nothing. Ledger surfaces override this to true, because a
   * journal line that hides its minor units is not a record.
   */
  decimals?: boolean;
  /** Prefix an explicit `+` on positive amounts. */
  signed?: boolean;
}

/**
 * Format kobo as naira.
 *
 * Grouping comes from `Intl.NumberFormat` rather than a hand-rolled regex so
 * locale grouping stays correct.
 */
export function formatKobo(value: HawkKobo | null | undefined, options: HawkMoneyOptions = {}): string {
  const { symbol = true, decimals = false, signed = false } = options;
  const kobo = toKobo(value);
  const negative = kobo < 0;
  const absolute = Math.abs(kobo);

  const naira = absolute / 100;
  const body = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(decimals ? naira : Math.floor(naira));

  const sign = negative ? '-' : signed && kobo > 0 ? '+' : '';
  return `${sign}${symbol ? NAIRA : ''}${body}`;
}

/**
 * Compact form for dense surfaces — `₦8.4k`, `₦1.2m`.
 *
 * Board rows and chart axes only. **Never a balance**: a user reading their own
 * money is entitled to every digit of it.
 */
export function formatKoboCompact(value: HawkKobo | null | undefined, symbol = true): string {
  const kobo = toKobo(value);
  const naira = Math.abs(kobo) / 100;
  const sign = kobo < 0 ? '-' : '';
  const prefix = `${sign}${symbol ? NAIRA : ''}`;

  if (naira >= 1_000_000_000) return `${prefix}${trim(naira / 1_000_000_000)}b`;
  if (naira >= 1_000_000) return `${prefix}${trim(naira / 1_000_000)}m`;
  if (naira >= 1_000) return `${prefix}${trim(naira / 1_000)}k`;
  return `${prefix}${Math.round(naira)}`;
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Duration, as the meter renders it: `MM:SS`, or `H:MM:SS` past an hour.
 *
 * Zero-padded so the width never changes mid-call — the same reason the record
 * face is tabular. A meter whose layout shifts as it counts is a meter nobody
 * trusts.
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Per-second rate → the cost of `seconds` seconds, in kobo. */
export function costOfSeconds(ratePerSecondKobo: HawkKobo, seconds: number): number {
  return toKobo(ratePerSecondKobo) * Math.max(0, Math.floor(seconds));
}

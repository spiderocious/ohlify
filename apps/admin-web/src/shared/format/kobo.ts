import { formatNaira } from '@ohlify/core';

/**
 * Backend serializes kobo amounts as `number | string` — number for safe
 * integers (≤2^53), string for anything bigger. Both must format identically.
 * BigInt round-trips both safely.
 */
export function formatKobo(
  amount: number | string | null | undefined,
  options: { signed?: boolean; decimals?: number } = {},
): string {
  if (amount === null || amount === undefined) return '—';
  try {
    const big = typeof amount === 'string' ? BigInt(amount) : BigInt(Math.trunc(amount));
    return formatNaira(big, options);
  } catch {
    return String(amount);
  }
}

/** Sum of (signed) kobo values, BigInt-safe. */
export function sumKobo(amounts: ReadonlyArray<number | string>): bigint {
  return amounts.reduce<bigint>(
    (acc, x) => acc + (typeof x === 'string' ? BigInt(x) : BigInt(Math.trunc(x))),
    0n,
  );
}

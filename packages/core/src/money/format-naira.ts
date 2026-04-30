/**
 * Format a kobo (minor unit) value as Nigerian Naira display string.
 * Mirrors the format used throughout the mobile mocks: "₦20,000.00".
 *
 * @param amountKobo  bigint (preferred) or number — amount in kobo.
 *                    100 kobo = 1 NGN.
 * @param options.signed  Prepend "+"/"−". Default false.
 * @param options.decimals Number of decimal places. Default 2.
 */
export interface FormatNairaOptions {
  signed?: boolean;
  decimals?: number;
}

export function formatNaira(amountKobo: bigint | number, options: FormatNairaOptions = {}): string {
  const decimals = options.decimals ?? 2;
  const asNumber = typeof amountKobo === 'bigint' ? Number(amountKobo) : amountKobo;
  const naira = asNumber / 100;
  const abs = Math.abs(naira);

  const formatted = abs.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = options.signed ? (naira > 0 ? '+' : naira < 0 ? '-' : '') : naira < 0 ? '-' : '';
  return `${sign}₦${formatted}`;
}

/**
 * Parse a "₦20,000.00" / "-₦20,000.00" / "+₦20,000.00" display string into kobo.
 * Returns NaN-equivalent of `null` when the input doesn't parse cleanly.
 */
export function parseNairaToKobo(input: string): bigint | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const sign = trimmed.startsWith('-') ? -1n : 1n;
  const cleaned = trimmed.replace(/[+\-₦,\s]/g, '');
  if (cleaned === '' || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const fractionPadded = (fraction + '00').slice(0, 2);
  return sign * (BigInt(whole ?? '0') * 100n + BigInt(fractionPadded || '0'));
}

// All money is stored and computed in kobo (NGN minor units).
// DB column type: BIGINT. JSON serialization: number (fits under 2^53 for v1).

export type Kobo = bigint & { readonly __brand: 'Kobo' };

export const kobo = (n: bigint | number): Kobo => {
  const v = typeof n === 'number' ? BigInt(Math.round(n)) : n;
  return v as Kobo;
};

export const addKobo = (a: Kobo, b: Kobo): Kobo => (a + b) as Kobo;

export const subKobo = (a: Kobo, b: Kobo): Kobo => {
  if (b > a) throw new RangeError('Money subtraction would go negative');
  return (a - b) as Kobo;
};

// Serialize a Kobo / bigint kobo value to JSON. Returns a JS number when the
// magnitude fits in IEEE-754 safe range (< 2^53), else a string. The
// number|string union is intentional (conventions.md §6) — returning a number
// would silently truncate for kobo values above 2^53.
// eslint-disable-next-line sonarjs/function-return-type
export const koboToJson = (k: Kobo | bigint): number | string => {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = -max;
  if (k <= max && k >= min) return Number(k);
  return k.toString();
};

// Parse from a DB BIGINT row value (pg returns bigint columns as strings).
export const koboFromDb = (raw: string | number | bigint): Kobo =>
  kobo(typeof raw === 'string' ? BigInt(raw) : raw);

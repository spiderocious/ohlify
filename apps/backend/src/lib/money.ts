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

// Serialize to JSON. Throws if value exceeds safe integer range (guard for v1).
export const koboToJson = (k: Kobo): number => {
  if (k > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Kobo value ${k} exceeds MAX_SAFE_INTEGER — use string serialization`);
  }
  return Number(k);
};

// Parse from a DB BIGINT row value (pg returns bigint columns as strings).
export const koboFromDb = (raw: string | number | bigint): Kobo =>
  kobo(typeof raw === 'string' ? BigInt(raw) : raw);

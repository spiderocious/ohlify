// Strict boolean coercion for env-var flags. Resolves to true ONLY when the
// value is explicitly the string 'true' (case-insensitive). Every other value
// — including undefined, '', 'false', '0', 'no', typos like 'flase' — is false.
//
// Why strict? Env-var typos must fail closed: if you mistype the off-value you
// should get the off-state, not silently keep the feature running. See the
// worker toggles in server.ts for the canonical use.
export const isEnabled = (flag: string | undefined): boolean =>
  typeof flag === 'string' && flag.toLowerCase() === 'true';
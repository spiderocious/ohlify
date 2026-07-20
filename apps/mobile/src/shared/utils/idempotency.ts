/**
 * Generates a fresh UUID v4 for `Idempotency-Key` headers. Mirrors
 * mobile/lib/shared/utils/idempotency.dart. Avoids pulling in the `uuid`
 * package or `expo-crypto` for a single call site — `crypto.randomUUID` is
 * not guaranteed available in Hermes, so this is a small dependency-free
 * RFC 4122 v4 generator (id is not security-sensitive, just needs to be
 * unique per attempt).
 */
export function idempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

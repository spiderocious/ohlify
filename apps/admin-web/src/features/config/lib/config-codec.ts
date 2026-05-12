/**
 * Round-trip between the JSON value the backend stores and the plain string
 * the UI inputs work with. Each `ConfigKind` has a matching pair:
 *
 *   decode: storedValue → string the input shows
 *   encode: string from input → JSON value to send back
 *
 * Errors are surfaced as `{ error: string }` so the field can render a
 * red border + message instead of silently mangling the value.
 */
import type { ConfigKind } from './config-registry.js';

export type EncodeResult = { ok: true; value: unknown } | { ok: false; error: string };

// ── decode (storedJson → display string) ──────────────────────────────────

export function decodeForInput(kind: ConfigKind, raw: unknown): string {
  switch (kind) {
    case 'money_kobo': {
      // kobo (integer) → naira (decimal). 100_000 kobo → "1000" or "1000.50".
      const k = numericOrNaN(raw);
      if (Number.isNaN(k)) return String(raw ?? '');
      const naira = k / 100;
      // Avoid trailing .00 for integers — looks cleaner.
      return Number.isInteger(naira) ? String(naira) : naira.toFixed(2);
    }
    case 'percent_bps': {
      // bps → percent. 1500 → "15", 50 → "0.5".
      const b = numericOrNaN(raw);
      if (Number.isNaN(b)) return String(raw ?? '');
      const pct = b / 100;
      return Number.isInteger(pct) ? String(pct) : String(pct);
    }
    case 'duration_seconds':
    case 'duration_minutes':
    case 'duration_days':
    case 'number': {
      const n = numericOrNaN(raw);
      return Number.isNaN(n) ? String(raw ?? '') : String(n);
    }
    case 'boolean':
      return raw === true ? 'true' : 'false';
    case 'enum':
    case 'string':
      return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    case 'string_array':
      if (Array.isArray(raw)) return raw.map(String).join(', ');
      return String(raw ?? '');
    case 'number_array':
      if (Array.isArray(raw)) return raw.map((x) => String(x)).join(', ');
      return String(raw ?? '');
  }
}

// ── encode (display string → storedJson) ──────────────────────────────────

export function encodeFromInput(kind: ConfigKind, raw: string): EncodeResult {
  const trimmed = raw.trim();
  switch (kind) {
    case 'money_kobo': {
      if (trimmed === '') return { ok: false, error: 'Required' };
      const naira = Number(trimmed);
      if (!Number.isFinite(naira) || naira < 0) {
        return { ok: false, error: 'Must be a non-negative number' };
      }
      // Round to avoid float artifacts: ₦100.50 → 10050 kobo, never 10049.999.
      return { ok: true, value: Math.round(naira * 100) };
    }
    case 'percent_bps': {
      if (trimmed === '') return { ok: false, error: 'Required' };
      const pct = Number(trimmed);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return { ok: false, error: '0–100' };
      }
      return { ok: true, value: Math.round(pct * 100) };
    }
    case 'duration_seconds':
    case 'duration_minutes':
    case 'duration_days':
    case 'number': {
      if (trimmed === '') return { ok: false, error: 'Required' };
      const n = Number(trimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return { ok: false, error: 'Must be a non-negative integer' };
      }
      return { ok: true, value: n };
    }
    case 'boolean':
      return { ok: true, value: trimmed === 'true' };
    case 'enum':
      if (trimmed === '') return { ok: false, error: 'Required' };
      return { ok: true, value: trimmed };
    case 'string':
      return { ok: true, value: trimmed };
    case 'string_array': {
      if (trimmed === '') return { ok: true, value: [] };
      const parts = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return { ok: true, value: parts };
    }
    case 'number_array': {
      if (trimmed === '') return { ok: true, value: [] };
      const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      const nums: number[] = [];
      for (const p of parts) {
        const n = Number(p);
        if (!Number.isFinite(n)) return { ok: false, error: `"${p}" isn't a number` };
        nums.push(n);
      }
      return { ok: true, value: nums };
    }
  }
}

/**
 * Used by the dirty-detection logic. Two stored JSON values are "equal"
 * for our purposes if they encode to the same display string under the
 * same kind — this avoids false dirties for `100` vs `"100"` etc.
 */
export function valuesEqual(kind: ConfigKind, a: unknown, b: unknown): boolean {
  // For arrays/objects fall back to JSON.stringify; for scalars compare
  // the decoded strings (which is more lenient on type-coerced numerics).
  if (kind === 'string_array' || kind === 'number_array') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return a === b;
    }
  }
  return decodeForInput(kind, a) === decodeForInput(kind, b);
}

/**
 * Human-readable preview shown next to a duration input. "60 seconds → 1 min".
 * Returns empty string when there's nothing useful to add (raw < unit).
 */
export function previewForKind(kind: ConfigKind, value: string): string {
  if (value === '' || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  switch (kind) {
    case 'duration_seconds':
      if (n >= 86400) return `≈ ${(n / 86400).toFixed(1)} days`;
      if (n >= 3600) return `≈ ${(n / 3600).toFixed(1)} hours`;
      if (n >= 60) return `≈ ${(n / 60).toFixed(1)} minutes`;
      return '';
    case 'duration_minutes':
      if (n >= 60 * 24) return `≈ ${(n / 60 / 24).toFixed(1)} days`;
      if (n >= 60) return `≈ ${(n / 60).toFixed(1)} hours`;
      return '';
    case 'duration_days':
      if (n >= 7) return `≈ ${(n / 7).toFixed(1)} weeks`;
      return '';
    case 'percent_bps':
      return `${(n * 100).toFixed(0)} bps`;
    case 'money_kobo':
      return `${(n * 100).toLocaleString()} kobo`;
    default:
      return '';
  }
}

// ── helpers ──────────────────────────────────────────────────────────────

function numericOrNaN(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

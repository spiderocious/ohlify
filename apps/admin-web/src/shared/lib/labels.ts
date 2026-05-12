/**
 * Tiny label helpers for enum → human strings. Keeping them centralised
 * means screens never reach for a switch on a status enum literal.
 */

export function humanizeStatus(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return '—';
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

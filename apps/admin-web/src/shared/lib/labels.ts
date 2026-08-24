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

/**
 * Admin role → the word operators actually use for it. `finance_ops` is the
 * only one that is not just a capitalisation away from its enum value, which
 * is exactly why this belongs here rather than inline at each call site.
 */
export function humanizeRole(role: string | null | undefined): string {
  if (!role) return '—';
  if (role === 'finance_ops') return 'Finance';
  if (role === 'admin') return 'Admin';
  if (role === 'support') return 'Support';
  return humanizeStatus(role);
}

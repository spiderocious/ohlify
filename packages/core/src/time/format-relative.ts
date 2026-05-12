/**
 * "2 days ago" / "1 hour ago" / "Just now" / "in 3 mins" relative formatter.
 *
 * Matches mobile usage in `Review.timeAgo` and `AppNotification.timeLabel`. We
 * compute against UTC-safe Date math; clients should pass ISO 8601 strings.
 */
export function formatRelative(dateOrIso: Date | string, reference: Date = new Date()): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const diffMs = d.getTime() - reference.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);

  const sec = Math.round(abs / 1000);
  if (sec < 30) return 'Just now';

  const min = Math.round(sec / 60);
  if (min < 60) return phrase(min, min === 1 ? 'min' : 'mins', past);

  const hr = Math.round(min / 60);
  if (hr < 24) return phrase(hr, hr === 1 ? 'hour' : 'hours', past);

  const day = Math.round(hr / 24);
  if (day < 7) return phrase(day, day === 1 ? 'day' : 'days', past);

  const week = Math.round(day / 7);
  if (week < 5) return phrase(week, week === 1 ? 'week' : 'weeks', past);

  const month = Math.round(day / 30);
  if (month < 12) return phrase(month, month === 1 ? 'month' : 'months', past);

  const year = Math.round(day / 365);
  return phrase(year, year === 1 ? 'year' : 'years', past);
}

function phrase(value: number, unit: string, past: boolean): string {
  return past ? `${value} ${unit} ago` : `in ${value} ${unit}`;
}

/**
 * Compact relative timestamps for the conversation list and thread —
 * "now", "5m", "3h", "Mon", "12 Mar". Mirrors
 * mobile/lib/features/chat/helpers/format_chat_time.dart.
 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatChatListTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24 && d.getDate() === now.getDate()) return `${diffHours}h`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return WEEKDAYS[d.getDay()]!;

  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Clock time for message bubbles — "14:05". */
export function formatBubbleTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Day separator label for the thread — "Today", "Yesterday", "12 March". */
export function formatDayLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

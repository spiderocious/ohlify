import type { AdminLabelledPoint, AdminTechnicalDashboard } from '@ohlify/api';
import {
  IconBank,
  IconBriefcase,
  IconRefresh,
  IconSend,
  type HawkChartPoint,
  type HawkIconComponent,
} from '@ohlify/hawk-ui';

/**
 * Presentation helpers for the technical board.
 *
 * Thinner than the business dashboard's adapters because most of this payload
 * is already display-ready — a queue depth is a queue depth. What is here is
 * the formatting the server deliberately does not do: durations and ages,
 * which must be rendered client-side so a board left open does not freeze its
 * own clock.
 */

export const points = (raw: readonly AdminLabelledPoint[]): HawkChartPoint[] =>
  raw.map((point) => ({ label: point.label, value: point.value }));

/** Seconds → a compact age. Returns undefined when there is nothing to age. */
export function formatSeconds(seconds: number | null | undefined): string | undefined {
  if (seconds === null || seconds === undefined) return undefined;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86_400);
  const h = Math.round((seconds % 86_400) / 3600);
  return h === 0 ? `${d}d` : `${d}d ${h}h`;
}

/** Uptime reads better in coarse units than as a raw second count. */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Human labels for the dependency probes the server returns by key. */
const DEPENDENCY_LABELS: Record<string, string> = {
  db: 'Postgres',
  redis: 'Redis',
};

export const dependencyLabel = (key: string): string => DEPENDENCY_LABELS[key] ?? key;

export interface QueueLike {
  name: string;
  icon: HawkIconComponent;
  label: string;
}

/**
 * The two BullMQ queues, named for what they do.
 *
 * Depths are not exposed by the API: reading them means a live BullMQ
 * connection from the request path, and the outbox — which IS fully reported —
 * is where the real backlog risk sits. Listing the queues without inventing
 * numbers keeps them visible without implying a measurement.
 */
export const KNOWN_QUEUES: readonly QueueLike[] = [
  { name: 'withdrawal-review-timeout', icon: IconBank, label: 'Withdrawal review timeouts' },
  { name: 'campaign-send', icon: IconSend, label: 'Campaign sends' },
];

export { IconBriefcase, IconRefresh };

/** True when anything on the board wants an operator's attention. */
export function hasTechnicalAlert(data: AdminTechnicalDashboard): boolean {
  return (
    data.outbox.dead_lettered > 0 ||
    data.integrations.webhooks.unprocessed > 0 ||
    data.integrations.webhooks.errored > 0 ||
    !data.integrity.ledger_balanced ||
    data.health.pool.waiting > 0 ||
    data.health.dependencies.some((probe) => probe.state !== 'ok')
  );
}

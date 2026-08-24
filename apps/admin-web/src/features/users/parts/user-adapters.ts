import type { AdminUserDetail } from '@ohlify/api';
import type { HawkChartPoint, HawkStep } from '@ohlify/hawk-ui';

import { absoluteTime } from './user-status.js';

/**
 * Shapes the user detail response for the console.
 *
 * Only the derivations that would otherwise clutter a component live here —
 * most of the payload is already display-ready, because the service does the
 * joining. What is left is the two things the server deliberately does not do:
 * build a lifecycle from scattered timestamps, and bucket calls into a trend.
 */

/** Human gap between two timestamps — the interesting part of a lifecycle. */
function gapBetween(from: string | null, to: string | null): string | undefined {
  if (!from || !to) return undefined;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'immediately after';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} later`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} later`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} later`;
}

/**
 * The account lifecycle as a timeline.
 *
 * Stages that never happened are dropped rather than shown as pending: a
 * client has no KYC stage at all, and rendering an empty one for them implies
 * something is outstanding when nothing is.
 *
 * The `description` on each step is the GAP from the one before, because that
 * is the finding — three weeks between KYC submitted and reviewed is a queue
 * problem, and a column of dates hides it.
 */
export function buildLifecycle(user: AdminUserDetail): HawkStep[] {
  const steps: HawkStep[] = [
    { label: 'Registered', timestamp: absoluteTime(user.created_at) },
  ];

  if (user.email_verified_at) {
    const gap = gapBetween(user.created_at, user.email_verified_at);
    steps.push({
      label: 'Email verified',
      timestamp: absoluteTime(user.email_verified_at),
      ...(gap ? { description: gap } : {}),
    });
  }
  if (user.phone_verified_at) {
    const gap = gapBetween(user.email_verified_at ?? user.created_at, user.phone_verified_at);
    steps.push({
      label: 'Phone verified',
      timestamp: absoluteTime(user.phone_verified_at),
      ...(gap ? { description: gap } : {}),
    });
  }
  if (user.kyc_submitted_at) {
    const gap = gapBetween(user.created_at, user.kyc_submitted_at);
    steps.push({
      label: 'KYC submitted',
      timestamp: absoluteTime(user.kyc_submitted_at),
      ...(gap ? { description: gap } : {}),
    });
  }
  if (user.kyc_reviewed_at) {
    const gap = gapBetween(user.kyc_submitted_at, user.kyc_reviewed_at);
    const rejected = user.kyc_status === 'rejected';
    steps.push({
      label: rejected ? 'KYC rejected' : 'KYC approved',
      timestamp: absoluteTime(user.kyc_reviewed_at),
      ...(gap ? { description: gap } : {}),
      // A rejection is not "not reached yet" — it is a step that happened and
      // failed, and the stepper has a status for exactly that.
      ...(rejected ? { status: 'failed' as const } : {}),
    });
  }

  const firstCall = user.calls.at(-1);
  if (firstCall) {
    steps.push({
      label: 'First call',
      timestamp: absoluteTime(firstCall.created_at),
      description: firstCall.counterparty_name
        ? `with ${firstCall.counterparty_name}`
        : firstCall.id,
    });
  }

  return steps;
}

/**
 * Recent calls bucketed by week, oldest first.
 *
 * Derived client-side from the call list the payload already carries, rather
 * than asking the server for a second aggregate: the panel only wants a shape,
 * and twelve rows is enough to draw one.
 */
export function buildActivity(user: AdminUserDetail): HawkChartPoint[] {
  if (user.calls.length === 0) return [];

  const buckets = new Map<string, number>();
  for (const call of user.calls) {
    const date = new Date(call.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const label = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return [...buckets.entries()].reverse().map(([label, value]) => ({ label, value }));
}

/** The name to show a user by. Bottoms out at the email, which is required. */
export function displayName(user: {
  full_name: string | null;
  handle: string | null;
  email: string;
}): string {
  return user.full_name ?? user.handle ?? user.email;
}

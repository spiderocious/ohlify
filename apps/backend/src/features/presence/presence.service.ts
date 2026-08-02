import * as blocksRepo from '@features/profile/booking-blocks.repo.js';
import * as deviceTokensRepo from '@features/profile/device-tokens.repo.js';
import * as instantCallsRepo from '@features/instant-calls/instant-calls.repo.js';
import { bookingHitsBlock } from '@features/professionals/availability.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { nowUtc } from '@lib/time.js';
import { ServiceSuccess } from '@lib/service-result.js';

import { PRESENCE_MESSAGES } from './presence.messages.js';
import * as repo from './presence.repo.js';
import { ReachabilityDetail, ReachabilityReason, type PresenceView } from './presence.types.js';

// A device token FCM has touched recently can wake a phone even with the app
// killed, which is what makes ringing work at all. 30 days matches FCM's own
// token-staleness guidance.
const PUSH_REACHABLE_WINDOW_DAYS = 30;

const hasFreshDeviceToken = async (professionalId: string): Promise<boolean> => {
  const tokens = await deviceTokensRepo.findActiveTokensForUser(professionalId);
  const cutoff = nowUtc().getTime() - PUSH_REACHABLE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return tokens.some((t) => t.last_seen_at.getTime() >= cutoff);
};

// Is `now` inside one of the pro's do-not-disturb blocks? Reuses the booking
// overlap check with a 1-minute probe interval.
const isDndNow = async (professionalId: string): Promise<boolean> => {
  const rows = await blocksRepo.listForUser(professionalId);
  if (rows.length === 0) return false;
  const blocks = rows.map((b) => ({ startMinute: b.start_minute, endMinute: b.end_minute }));
  const tz = platformConfig.availability().default_timezone;
  return bookingHitsBlock(nowUtc(), 1, blocks, tz);
};

const unreachable = (professionalId: string, lastSeenAt: Date | null): PresenceView => ({
  user_id: professionalId,
  online: false,
  accepting_calls: false,
  dnd: false,
  reachable: false,
  last_seen_at: lastSeenAt ? lastSeenAt.toISOString() : null,
});

/**
 * Can this professional take a call right now?
 *
 * Three gates decide it: they accept calls, they are not in a do-not-disturb
 * block, and they are not already on one. Liveness is deliberately NOT among
 * them — a push token is what makes a phone ring, and it rings whether or not
 * the app is open, so gating on heartbeats would refuse calls to professionals
 * who are perfectly reachable.
 *
 * `view.online` survives as a cosmetic "active now" signal only.
 */
export const resolveReachability = async (
  professionalId: string,
): Promise<{ view: PresenceView; reason: ReachabilityReason; detail?: ReachabilityDetail }> => {
  const row = await repo.findPresence(professionalId);

  // A suspended, blocked, or un-approved pro is never reachable. kyc_status
  // survives a suspension, so both have to be checked. (BUGS.md D8.)
  // All three collapse to one `offline` reason (and one message) on purpose —
  // `detail` is what tells them apart after the fact.
  if (!row || row.role !== 'professional') {
    return {
      view: unreachable(professionalId, null),
      reason: ReachabilityReason.OFFLINE,
      detail: ReachabilityDetail.NOT_PROFESSIONAL,
    };
  }
  if (row.status !== 'active') {
    return {
      view: unreachable(professionalId, null),
      reason: ReachabilityReason.OFFLINE,
      detail: ReachabilityDetail.ACCOUNT_NOT_ACTIVE,
    };
  }
  if (row.kyc_status !== 'approved') {
    return {
      view: unreachable(professionalId, null),
      reason: ReachabilityReason.OFFLINE,
      detail: ReachabilityDetail.KYC_NOT_APPROVED,
    };
  }

  if (!(await hasFreshDeviceToken(professionalId))) {
    return {
      view: unreachable(professionalId, row.last_seen_at),
      reason: ReachabilityReason.UNREACHABLE,
      detail: ReachabilityDetail.NO_DEVICE_TOKEN,
    };
  }

  if (!row.is_available) {
    return {
      view: { ...unreachable(professionalId, row.last_seen_at), online: true },
      reason: ReachabilityReason.NOT_ACCEPTING,
      detail: ReachabilityDetail.NOT_ACCEPTING,
    };
  }

  if (await isDndNow(professionalId)) {
    return {
      view: {
        ...unreachable(professionalId, row.last_seen_at),
        online: true,
        accepting_calls: true,
        dnd: true,
      },
      reason: ReachabilityReason.DND,
      detail: ReachabilityDetail.DND,
    };
  }

  // Already ringing or talking. The unique live-call index would reject the
  // insert anyway; catching it here turns a 23505 into a clear "busy".
  if (await instantCallsRepo.findLiveForCallee(professionalId)) {
    return {
      view: {
        ...unreachable(professionalId, row.last_seen_at),
        online: true,
        accepting_calls: true,
      },
      reason: ReachabilityReason.BUSY,
      detail: ReachabilityDetail.BUSY,
    };
  }

  return {
    view: {
      user_id: professionalId,
      online: true,
      accepting_calls: true,
      dnd: false,
      reachable: true,
      last_seen_at: row.last_seen_at ? row.last_seen_at.toISOString() : null,
    },
    reason: ReachabilityReason.OK,
  };
};

export const getPresence = async (professionalId: string) => {
  const { view } = await resolveReachability(professionalId);
  return new ServiceSuccess(view, PRESENCE_MESSAGES.PRESENCE_FETCHED);
};

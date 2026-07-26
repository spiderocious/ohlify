import * as blocksRepo from '@features/profile/booking-blocks.repo.js';
import * as deviceTokensRepo from '@features/profile/device-tokens.repo.js';
import { bookingHitsBlock } from '@features/professionals/availability.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { nowUtc } from '@lib/time.js';
import { ServiceSuccess } from '@lib/service-result.js';

import { PRESENCE_MESSAGES } from './presence.messages.js';
import * as repo from './presence.repo.js';
import { ReachabilityReason, type PresenceView } from './presence.types.js';

// Is a pro's last heartbeat within the online window?
const isOnline = (lastSeen: Date | null, windowSeconds: number): boolean => {
  if (!lastSeen) return false;
  const ageSeconds = (nowUtc().getTime() - lastSeen.getTime()) / 1000;
  return ageSeconds <= windowSeconds;
};

// Push-reachable: the pro has a device token that FCM refreshed/used
// recently — their phone can ring even with the app killed (heartbeats stop
// the moment the app closes, so heartbeat-online alone would make killed-app
// ringing impossible). 30 days matches FCM's own token-staleness guidance.
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

const reachabilityReason = (
  online: boolean,
  acceptingCalls: boolean,
  dnd: boolean,
): ReachabilityReason => {
  if (!online) return ReachabilityReason.OFFLINE;
  if (!acceptingCalls) return ReachabilityReason.NOT_ACCEPTING;
  if (dnd) return ReachabilityReason.DND;
  return ReachabilityReason.OK;
};

// Resolve full reachability for a professional. This is the primitive the
// instant-call preflight (Phase 4) consumes: reachable === can-take-a-call-now.
export const resolveReachability = async (
  professionalId: string,
): Promise<{ view: PresenceView; reason: ReachabilityReason }> => {
  const { online_window_seconds } = platformConfig.presence();
  const row = await repo.findPresence(professionalId);

  // A suspended/blocked pro, or one not KYC-approved, is never reachable — the
  // instant-call preflight consumes this, so an enforcement lapse here would let
  // a suspended pro keep taking calls. kyc_status survives a suspension, so both
  // must be checked. (BUGS.md D8.)
  if (
    !row ||
    row.role !== 'professional' ||
    row.status !== 'active' ||
    row.kyc_status !== 'approved'
  ) {
    return {
      view: {
        user_id: professionalId,
        online: false,
        accepting_calls: false,
        dnd: false,
        reachable: false,
        last_seen_at: null,
      },
      reason: ReachabilityReason.OFFLINE,
    };
  }

  const online = isOnline(row.last_seen_at, online_window_seconds);
  // A pro counts as callable when the app is live (heartbeat) OR their
  // phone can be rung via push. `view.online` stays heartbeat-only — it
  // powers the "online now" UI dot; reachability is what gates calls.
  const contactable = online || (await hasFreshDeviceToken(professionalId));
  const acceptingCalls = row.is_available;
  const dnd = contactable ? await isDndNow(professionalId) : false;
  const reachable = contactable && acceptingCalls && !dnd;
  const reason = reachabilityReason(contactable, acceptingCalls, dnd);

  return {
    view: {
      user_id: professionalId,
      online,
      accepting_calls: acceptingCalls,
      dnd,
      reachable,
      last_seen_at: row.last_seen_at ? row.last_seen_at.toISOString() : null,
    },
    reason,
  };
};

export const heartbeat = async (userId: string) => {
  await repo.touchLastSeen(userId);
  return new ServiceSuccess({ ok: true }, PRESENCE_MESSAGES.HEARTBEAT_OK);
};

export const getPresence = async (professionalId: string) => {
  const { view } = await resolveReachability(professionalId);
  return new ServiceSuccess(view, PRESENCE_MESSAGES.PRESENCE_FETCHED);
};

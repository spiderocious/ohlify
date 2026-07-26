import * as authRepo from '@features/auth/auth.repo.js';
import { koboToJson } from '@lib/money.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './pro-dashboard.repo.js';

const RECENT_CALL_LIMIT = 5;

/**
 * Everything a professional's home screen needs, in one read.
 *
 * A professional's questions are different in kind from a client's — am I
 * reachable, what have I earned, what needs me — which is why they get their
 * own screen and their own endpoint rather than a filtered version of the
 * client's discovery feed.
 *
 * The pieces are independent, so they fan out in parallel; a slow sparkline
 * should not hold up the availability toggle.
 */
export const getProfessionalDashboard = async (userId: string, days: number) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.role !== 'professional') {
    return new ServiceError('forbidden', MESSAGE_KEYS.FORBIDDEN, 403);
  }

  const [earnings, attention, recentCalls, series] = await Promise.all([
    repo.readEarnings(userId),
    repo.readAttention(userId),
    repo.readRecentCalls(userId, RECENT_CALL_LIMIT),
    repo.readDailySeries(userId, days),
  ]);

  return new ServiceSuccess(
    {
      // The professional's single most important control. `is_available` has
      // existed on the backend all along with no UI anywhere.
      is_available: user.is_available,
      kyc_status: user.kyc_status,
      kyc_reject_reason: user.kyc_reject_reason ?? null,
      earnings: {
        today_kobo: koboToJson(BigInt(earnings.today_kobo)),
        week_kobo: koboToJson(BigInt(earnings.week_kobo)),
        withdrawable_kobo: koboToJson(BigInt(earnings.withdrawable_kobo)),
      },
      attention: {
        unread_messages: Number(attention.unread_messages),
        pending_schedules: Number(attention.pending_schedules),
        missed_calls_today: Number(attention.missed_calls_today),
      },
      recent_calls: recentCalls.map((c) => ({
        id: c.id,
        call_type: c.call_type,
        status: c.status,
        connected_seconds: c.connected_seconds,
        // Net of the platform fee — what the professional actually kept.
        earned_kobo: koboToJson(BigInt(c.settled_kobo)),
        peer_name: c.peer_name,
        peer_avatar_url: c.peer_avatar_url,
        created_at: c.created_at.toISOString(),
      })),
      series: series.map((p) => ({
        day: p.day.toISOString(),
        calls: Number(p.calls),
        seconds: Number(p.seconds),
        earned_kobo: koboToJson(BigInt(p.earned_kobo)),
      })),
    },
    MESSAGE_KEYS.HOME_FETCHED,
  );
};

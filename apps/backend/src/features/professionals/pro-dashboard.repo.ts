import { pool } from '@lib/db/pool.js';

export interface ProEarningsRow {
  today_kobo: string;
  week_kobo: string;
  withdrawable_kobo: string;
}

export interface ProAttentionRow {
  unread_messages: string;
  pending_schedules: string;
  missed_calls_today: string;
}

export interface ProRecentCallRow {
  id: string;
  call_type: string;
  status: string;
  connected_seconds: number;
  settled_kobo: string;
  peer_name: string | null;
  peer_avatar_url: string | null;
  ended_at: Date | null;
  created_at: Date;
}

export interface ProDailyPointRow {
  day: Date;
  calls: string;
  seconds: string;
  earned_kobo: string;
}

/**
 * What a professional has earned, over the periods they actually think in.
 *
 * Reads settlement journal lines rather than `instant_calls.settled_kobo`,
 * because settled_kobo is the GROSS charge — the platform fee comes off before
 * the professional sees anything, and showing the gross would overstate
 * earnings by the fee on every call.
 */
export const readEarnings = async (professionalId: string): Promise<ProEarningsRow> => {
  const res = await pool.query<ProEarningsRow>(
    `SELECT
       COALESCE(SUM(we.signed_amount_kobo) FILTER (
         WHERE we.created_at >= date_trunc('day', now())), 0)::text  AS today_kobo,
       COALESCE(SUM(we.signed_amount_kobo) FILTER (
         WHERE we.created_at >= now() - INTERVAL '7 days'), 0)::text AS week_kobo,
       COALESCE((SELECT ab.balance_kobo FROM accounts a2
                   JOIN account_balances ab ON ab.account_id = a2.id
                  WHERE a2.owner_user_id = $1 AND a2.kind = 'user' LIMIT 1), 0)::text
                                                                     AS withdrawable_kobo
       FROM wallet_entries we
       JOIN accounts a ON a.id = we.account_id
      WHERE a.owner_user_id = $1
        AND a.kind = 'user'
        AND we.signed_amount_kobo > 0`,
    [professionalId],
  );
  return res.rows[0] ?? { today_kobo: '0', week_kobo: '0', withdrawable_kobo: '0' };
};

/** The three things a professional may need to act on right now. */
export const readAttention = async (professionalId: string): Promise<ProAttentionRow> => {
  const res = await pool.query<ProAttentionRow>(
    `SELECT
       COALESCE((SELECT SUM(professional_unread) FROM conversations
                  WHERE professional_id = $1), 0)::text AS unread_messages,
       COALESCE((SELECT COUNT(*) FROM messages m
                   JOIN conversations c ON c.id = m.conversation_id
                  WHERE c.professional_id = $1
                    AND m.kind::text = 'schedule'
                    AND m.schedule_status = 'pending'
                    AND m.sender_user_id <> $1), 0)::text AS pending_schedules,
       COALESCE((SELECT COUNT(*) FROM instant_calls
                  WHERE callee_user_id = $1
                    AND status = 'missed'
                    AND created_at >= date_trunc('day', now())), 0)::text AS missed_calls_today`,
    [professionalId],
  );
  return res.rows[0] ?? { unread_messages: '0', pending_schedules: '0', missed_calls_today: '0' };
};

/** Last few calls, each with what the professional actually kept. */
export const readRecentCalls = async (
  professionalId: string,
  limit: number,
): Promise<ProRecentCallRow[]> => {
  const res = await pool.query<ProRecentCallRow>(
    `SELECT ic.id,
            ic.call_type::text AS call_type,
            ic.status::text    AS status,
            ic.connected_seconds,
            -- Net of the platform fee: the credit line on this pro's own
            -- account for that call's settlement journal.
            COALESCE((SELECT we.signed_amount_kobo
                        FROM wallet_entries we
                        JOIN accounts a ON a.id = we.account_id
                       WHERE we.journal_id = ic.settlement_journal_id
                         AND a.owner_user_id = $1
                       LIMIT 1), 0)::text AS settled_kobo,
            u.full_name  AS peer_name,
            u.avatar_url AS peer_avatar_url,
            ic.ended_at,
            ic.created_at
       FROM instant_calls ic
       JOIN users u ON u.id = ic.caller_user_id
      WHERE ic.callee_user_id = $1
      ORDER BY ic.created_at DESC
      LIMIT $2`,
    [professionalId, limit],
  );
  return res.rows;
};

/**
 * Per-day totals for the sparkline.
 *
 * Deliberately minimal — calls, talk time, earnings. Message analytics are out
 * of scope: professionals would not act on them, and computing them correctly
 * is far more expensive than the insight is worth.
 */
export const readDailySeries = async (
  professionalId: string,
  days: number,
): Promise<ProDailyPointRow[]> => {
  const res = await pool.query<ProDailyPointRow>(
    `SELECT date_trunc('day', ic.created_at)             AS day,
            COUNT(*)::text                                AS calls,
            COALESCE(SUM(ic.connected_seconds), 0)::text  AS seconds,
            COALESCE(SUM((SELECT we.signed_amount_kobo
                            FROM wallet_entries we
                            JOIN accounts a ON a.id = we.account_id
                           WHERE we.journal_id = ic.settlement_journal_id
                             AND a.owner_user_id = $1
                           LIMIT 1)), 0)::text            AS earned_kobo
       FROM instant_calls ic
      WHERE ic.callee_user_id = $1
        AND ic.created_at >= now() - ($2 * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC`,
    [professionalId, days],
  );
  return res.rows;
};

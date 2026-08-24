import { pool } from '@lib/db/pool.js';

/**
 * The wide read behind the redesigned user detail screen.
 *
 * Kept beside `admin.users.repo` rather than folded into it because the two
 * answer different questions: that one lists and mutates users, this one
 * assembles everything hanging off a single user for the five-tab console.
 *
 * The schema has thirty-nine foreign keys pointing at `users` across
 * thirty-three tables. This does not fetch all of them — it fetches the ones an
 * operator actually acts on, capped and ordered, so the endpoint stays a single
 * round of parallel index lookups rather than a report.
 */

/** Recent-list cap. Deep history belongs on the dedicated feature screens. */
const RECENT_LIMIT = 12;

export interface VitalsRow {
  wallet_kobo: string;
  lifetime_earned_kobo: string;
  lifetime_spent_kobo: string;
  escrow_kobo: string;
  calls_total: string;
  calls_completed: string;
  calls_missed: string;
  rating: string | null;
  review_count: string;
  active_strikes: string;
}

/**
 * Headline figures, in one pass.
 *
 * Earned and spent are read off the ledger rather than a counter: signed
 * entries against the user's own account, split by sign. A denormalised
 * lifetime total is a number that drifts, and this one is cheap enough not to
 * need caching.
 */
export const vitals = async (userId: string): Promise<VitalsRow> => {
  const res = await pool.query<VitalsRow>(
    `SELECT
       COALESCE((
         SELECT ab.balance_kobo FROM account_balances ab
           JOIN accounts a ON a.id = ab.account_id
          WHERE a.kind = 'user' AND a.owner_user_id = $1
          LIMIT 1
       ), 0)::text AS wallet_kobo,
       COALESCE((
         SELECT SUM(we.signed_amount_kobo) FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.kind = 'user' AND a.owner_user_id = $1 AND we.signed_amount_kobo > 0
       ), 0)::text AS lifetime_earned_kobo,
       COALESCE((
         SELECT -SUM(we.signed_amount_kobo) FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.kind = 'user' AND a.owner_user_id = $1 AND we.signed_amount_kobo < 0
       ), 0)::text AS lifetime_spent_kobo,
       COALESCE((
         SELECT SUM(escrow_kobo) FROM minute_balances WHERE professional_id = $1
       ), 0)::text AS escrow_kobo,
       (SELECT COUNT(*) FROM instant_calls
         WHERE caller_user_id = $1 OR callee_user_id = $1)::text AS calls_total,
       (SELECT COUNT(*) FROM instant_calls
         WHERE (caller_user_id = $1 OR callee_user_id = $1)
           AND status = 'ended')::text AS calls_completed,
       (SELECT COUNT(*) FROM instant_calls
         WHERE (caller_user_id = $1 OR callee_user_id = $1)
           AND status = 'missed')::text AS calls_missed,
       (SELECT ra.rating::text FROM review_aggregates ra WHERE ra.user_id = $1) AS rating,
       COALESCE((
         SELECT ra.review_count FROM review_aggregates ra WHERE ra.user_id = $1
       ), 0)::text AS review_count,
       (SELECT COUNT(*) FROM strikes
         WHERE subject_user_id = $1 AND status = 'active')::text AS active_strikes`,
    [userId],
  );
  return res.rows[0]!;
};

export interface RateRow {
  id: string;
  call_type: string;
  duration_minutes: number;
  price_kobo: string;
}

export const rates = async (userId: string): Promise<RateRow[]> => {
  const res = await pool.query<RateRow>(
    `SELECT id, call_type::text AS call_type, duration_minutes, price_kobo::text
       FROM professional_rates
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY call_type, duration_minutes`,
    [userId],
  );
  return res.rows;
};

export interface CallRow {
  id: string;
  counterparty_id: string;
  counterparty_name: string | null;
  direction: string;
  call_type: string;
  status: string;
  connected_seconds: number;
  settled_kobo: string;
  created_at: Date;
}

/**
 * Instant calls, either side, with the other party resolved to a name.
 *
 * A row showing `usr_01hq…` as the counterparty makes an operator run a second
 * lookup for every line, so the join is worth it.
 */
export const calls = async (userId: string): Promise<CallRow[]> => {
  const res = await pool.query<CallRow>(
    `SELECT ic.id,
            CASE WHEN ic.caller_user_id = $1 THEN ic.callee_user_id ELSE ic.caller_user_id END
              AS counterparty_id,
            other.full_name AS counterparty_name,
            CASE WHEN ic.caller_user_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction,
            ic.call_type::text AS call_type,
            ic.status::text AS status,
            ic.connected_seconds,
            ic.settled_kobo::text,
            ic.created_at
       FROM instant_calls ic
       LEFT JOIN users other
         ON other.id = CASE WHEN ic.caller_user_id = $1
                            THEN ic.callee_user_id ELSE ic.caller_user_id END
      WHERE ic.caller_user_id = $1 OR ic.callee_user_id = $1
      ORDER BY ic.created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface TransactionRow {
  id: string;
  kind: string;
  signed_amount_kobo: string;
  memo: string | null;
  created_at: Date;
}

export const transactions = async (userId: string): Promise<TransactionRow[]> => {
  const res = await pool.query<TransactionRow>(
    `SELECT we.id, j.kind::text AS kind, we.signed_amount_kobo::text, j.memo, j.created_at
       FROM wallet_entries we
       JOIN accounts a ON a.id = we.account_id
       JOIN journal_entries j ON j.id = we.journal_id
      WHERE a.kind = 'user' AND a.owner_user_id = $1
      ORDER BY j.created_at DESC, j.id DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface WithdrawalRow {
  id: string;
  amount_kobo: string;
  status: string;
  failure_reason: string | null;
  requested_at: Date;
  processed_at: Date | null;
}

export const withdrawals = async (userId: string): Promise<WithdrawalRow[]> => {
  const res = await pool.query<WithdrawalRow>(
    `SELECT id, amount_kobo::text, status::text AS status, failure_reason,
            requested_at, processed_at
       FROM withdrawals
      WHERE user_id = $1
      ORDER BY requested_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface ReviewRow {
  id: string;
  reviewer_name: string | null;
  rating: number;
  feedback_text: string | null;
  hidden_at: Date | null;
  created_at: Date;
}

/**
 * Reviews ABOUT this user, hidden ones included.
 *
 * A hidden review is still evidence — an operator investigating a complaint
 * needs to know it existed — so moderation state is returned rather than the
 * row being filtered out.
 */
export const reviews = async (userId: string): Promise<ReviewRow[]> => {
  const res = await pool.query<ReviewRow>(
    `SELECT r.id, reviewer.full_name AS reviewer_name, r.rating,
            r.feedback_text, r.hidden_at, r.created_at
       FROM reviews r
       LEFT JOIN users reviewer ON reviewer.id = r.reviewer_user_id
      WHERE r.subject_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface StrikeRow {
  id: string;
  reason_code: string;
  description: string | null;
  status: string;
  related_call_id: string | null;
  dispute_comment: string | null;
  created_at: Date;
}

export const strikes = async (userId: string): Promise<StrikeRow[]> => {
  const res = await pool.query<StrikeRow>(
    `SELECT id, reason_code::text AS reason_code, description,
            status::text AS status, related_call_id, dispute_comment, created_at
       FROM strikes
      WHERE subject_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface ReportRow {
  id: string;
  direction: string;
  reason_code: string;
  status: string;
  counterparty_name: string | null;
  created_at: Date;
}

/**
 * Reports in both directions.
 *
 * Filed-versus-received is the whole meaning of the row: a user who files many
 * and receives none reads very differently from the reverse, and collapsing
 * them into one count loses that.
 */
export const reports = async (userId: string): Promise<ReportRow[]> => {
  const res = await pool.query<ReportRow>(
    `(SELECT r.id, 'filed' AS direction, r.reason_code, r.status::text AS status,
             target.full_name AS counterparty_name, r.created_at
        FROM reports r
        LEFT JOIN users target ON target.id = r.target_id
       WHERE r.reporter_user_id = $1)
     UNION ALL
     (SELECT r.id, 'received' AS direction, r.reason_code, r.status::text AS status,
             reporter.full_name AS counterparty_name, r.created_at
        FROM reports r
        LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
       WHERE r.target_type = 'profile' AND r.target_id = $1)
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface SessionRow {
  id: string;
  platform: string | null;
  app_version: string | null;
  device_model: string | null;
  os_version: string | null;
  ip: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

export const sessions = async (userId: string): Promise<SessionRow[]> => {
  const res = await pool.query<SessionRow>(
    `SELECT id, platform, app_version, device_model, os_version,
            host(ip) AS ip, created_at, last_used_at
       FROM auth_sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
      ORDER BY last_used_at DESC NULLS LAST
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface AuthEventRow {
  id: string;
  event: string;
  outcome: string;
  reason: string | null;
  ip: string | null;
  platform: string | null;
  created_at: Date;
}

/**
 * The authentication trail.
 *
 * The single most useful block for support: "was that actually them?" is
 * answered by an address and a timestamp, not by a status field.
 */
export const authEvents = async (userId: string): Promise<AuthEventRow[]> => {
  const res = await pool.query<AuthEventRow>(
    `SELECT id, event, outcome, reason, host(ip) AS ip, platform, created_at
       FROM auth_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface DeviceRow {
  token: string;
  platform: string;
  app_version: string | null;
  device_model: string | null;
  last_seen_at: Date;
}

export const devices = async (userId: string): Promise<DeviceRow[]> => {
  const res = await pool.query<DeviceRow>(
    `SELECT token, platform, app_version, device_model, last_seen_at
       FROM device_tokens
      WHERE user_id = $1
      ORDER BY last_seen_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface PrefsRow {
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

/**
 * Notification preferences.
 *
 * Defaults to all-on when no row exists, matching the product: a user who has
 * never touched settings is opted in, and reporting "off" for them would send
 * support chasing a switch nobody flipped.
 */
export const prefs = async (userId: string): Promise<PrefsRow> => {
  const res = await pool.query<PrefsRow>(
    'SELECT sms_enabled, email_enabled, push_enabled FROM notification_preferences WHERE user_id = $1',
    [userId],
  );
  return res.rows[0] ?? { sms_enabled: true, email_enabled: true, push_enabled: true };
};

export interface TicketRow {
  id: string;
  subject: string;
  status: string;
  created_at: Date;
}

export const tickets = async (userId: string): Promise<TicketRow[]> => {
  const res = await pool.query<TicketRow>(
    `SELECT id, subject, status, created_at
       FROM tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface ChatRow {
  conversations: string;
  messages_sent: string;
  last_message_at: Date | null;
}

/** Chat VOLUME only — contents are never returned to the admin console. */
export const chat = async (userId: string): Promise<ChatRow> => {
  const res = await pool.query<ChatRow>(
    `SELECT
       (SELECT COUNT(*) FROM conversations
         WHERE client_user_id = $1 OR professional_id = $1)::text AS conversations,
       (SELECT COUNT(*) FROM messages WHERE sender_user_id = $1)::text AS messages_sent,
       (SELECT MAX(created_at) FROM messages WHERE sender_user_id = $1) AS last_message_at`,
    [userId],
  );
  return res.rows[0]!;
};

export interface MinutesHeldRow {
  counterparty_name: string | null;
  call_type: string;
  seconds_remaining: number;
  escrow_kobo: string;
}

/** Minutes clients hold with this professional — a liability against them. */
export const minutesHeld = async (userId: string): Promise<MinutesHeldRow[]> => {
  const res = await pool.query<MinutesHeldRow>(
    `SELECT holder.full_name AS counterparty_name,
            mb.call_type::text AS call_type,
            mb.seconds_remaining,
            mb.escrow_kobo::text
       FROM minute_balances mb
       LEFT JOIN users holder ON holder.id = mb.user_id
      WHERE mb.professional_id = $1 AND mb.seconds_remaining > 0
      ORDER BY mb.escrow_kobo DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface AdminActionRow {
  id: string;
  actor: string | null;
  action: string;
  note: string | null;
  created_at: Date;
}

export const adminActions = async (userId: string): Promise<AdminActionRow[]> => {
  const res = await pool.query<AdminActionRow>(
    `SELECT l.id, au.email AS actor, l.action, l.note, l.created_at
       FROM admin_audit_log l
       LEFT JOIN admin_users au ON au.id = l.admin_user_id
      WHERE l.target_id = $1
      ORDER BY l.created_at DESC
      LIMIT $2`,
    [userId, RECENT_LIMIT],
  );
  return res.rows;
};

export interface KycExtraRow {
  submission_count: string;
  reject_item_keys: string[] | null;
}

/**
 * The bits of the KYC picture the existing query does not carry.
 *
 * A resubmission loop is a signal in itself: three attempts usually means the
 * rejection reason was never clear to the user, which is a product problem
 * rather than a fraud one.
 */
export const kycExtra = async (userId: string): Promise<KycExtraRow> => {
  const res = await pool.query<KycExtraRow>(
    `SELECT
       (SELECT COUNT(*) FROM kyc_submissions WHERE user_id = $1)::text AS submission_count,
       (SELECT reject_item_keys FROM kyc_submissions
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) AS reject_item_keys`,
    [userId],
  );
  return res.rows[0]!;
};

export interface ProfileExtraRow {
  cover_photo_url: string | null;
  selfie_upload_key: string | null;
  interests: string[];
  categories: string[];
  is_available: boolean;
  handle_changed_at: Date | null;
}

/** Columns on `users` the list view has no need for. */
export const profileExtra = async (userId: string): Promise<ProfileExtraRow | undefined> => {
  const res = await pool.query<ProfileExtraRow>(
    `SELECT cover_photo_url, selfie_upload_key, interests, categories,
            is_available, handle_changed_at
       FROM users WHERE id = $1`,
    [userId],
  );
  return res.rows[0];
};

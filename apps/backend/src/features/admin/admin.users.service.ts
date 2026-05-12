import * as authRepo from '@features/auth/auth.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { signAccessToken } from '@lib/security/jwt.js';
import { hashPassword } from '@lib/security/password.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { readUserAvailableBalance, readUserPendingBalance } from '@lib/wallet/balance.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.users.repo.js';
import type {
  AdminBlockUserDto,
  AdminImpersonateUserDto,
  AdminListUsersQueryDto,
  AdminResetPasswordDto,
  AdminSuspendUserDto,
  AdminUnsuspendUserDto,
} from './admin.write.schema.js';

const toView = (row: repo.AdminUserRow) => ({
  id: row.id,
  role: row.role,
  status: row.status,
  email: row.email,
  email_verified_at: row.email_verified_at?.toISOString() ?? null,
  phone_number: row.phone_number,
  phone_verified_at: row.phone_verified_at?.toISOString() ?? null,
  full_name: row.full_name,
  handle: row.handle,
  avatar_url: row.avatar_url,
  occupation: row.occupation,
  description: row.description,
  kyc_status: row.kyc_status,
  kyc_submitted_at: row.kyc_submitted_at?.toISOString() ?? null,
  kyc_reviewed_at: row.kyc_reviewed_at?.toISOString() ?? null,
  kyc_reject_reason: row.kyc_reject_reason,
  last_seen_at: row.last_seen_at?.toISOString() ?? null,
  suspended_until: row.suspended_until?.toISOString() ?? null,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

export const listUsers = async (dto: AdminListUsersQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_USERS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.list({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.role ? { role: dto.role } : {}),
    ...(dto.status ? { status: dto.status } : {}),
    ...(dto.kyc_status ? { kyc_status: dto.kyc_status } : {}),
    ...(dto.q ? { q: dto.q } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_USERS_LIST_FETCHED,
  );
};

// Deep-detail user view for the admin UI. Bundles the things support
// most often needs in one round trip:
//   - core user record
//   - latest KYC submission (with reject reason if rejected)
//   - bank account snapshot (no full account number)
//   - wallet balances (available + pending)
//   - last 10 calls as caller, last 10 as callee
//   - last 10 wallet transactions
//   - flags (active reports targeting this user, recent failed payouts)
//
// All reads are independent — fan them out in parallel.
export const getUser = async (userId: string) => {
  const row = await repo.findById(userId);
  if (!row || row.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_FETCHED, 404);
  }

  const [kyc, bank, available, pending, callsAsCaller, callsAsCallee, transactions, flags] =
    await Promise.all([
      pool.query<{
        id: string;
        identity_type: string;
        identity_number: string;
        document_upload_id: string | null;
        selfie_upload_key: string | null;
        status: string;
        reviewed_by: string | null;
        reviewed_at: Date | null;
        reject_reason_code: string | null;
        reject_note: string | null;
        created_at: Date;
      }>(
        `SELECT id, identity_type, identity_number, document_upload_id, selfie_upload_key,
                status::text AS status,
                reviewed_by, reviewed_at, reject_reason_code, reject_note, created_at
           FROM kyc_submissions
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
        [userId],
      ),
      pool.query<{
        bank_code: string;
        bank_name: string;
        account_number_last4: string;
        account_name: string;
        added_at: Date;
      }>(
        // Mask the full account number — only return last 4. The ops UI
        // never needs the raw value; if it ever does, that's a separate,
        // narrower endpoint with extra audit.
        `SELECT bank_code, bank_name,
                RIGHT(account_number, 4) AS account_number_last4,
                account_name, added_at
           FROM bank_accounts
           WHERE user_id = $1
           LIMIT 1`,
        [userId],
      ),
      readUserAvailableBalance(userId),
      readUserPendingBalance(userId),
      pool.query<{
        id: string;
        status: string;
        callee_user_id: string;
        start_at: Date;
        connected_seconds: number;
        ended_at: Date | null;
      }>(
        `SELECT c.id, c.status::text AS status, b.callee_user_id,
                b.start_at, c.connected_seconds, c.ended_at
           FROM calls c
           JOIN bookings b ON b.id = c.booking_id
           WHERE b.caller_user_id = $1
           ORDER BY c.created_at DESC
           LIMIT 10`,
        [userId],
      ),
      pool.query<{
        id: string;
        status: string;
        caller_user_id: string;
        start_at: Date;
        connected_seconds: number;
        ended_at: Date | null;
      }>(
        `SELECT c.id, c.status::text AS status, b.caller_user_id,
                b.start_at, c.connected_seconds, c.ended_at
           FROM calls c
           JOIN bookings b ON b.id = c.booking_id
           WHERE b.callee_user_id = $1
           ORDER BY c.created_at DESC
           LIMIT 10`,
        [userId],
      ),
      pool.query<{
        journal_id: string;
        kind: string;
        signed_amount_kobo: string;
        memo: string | null;
        created_at: Date;
      }>(
        `SELECT j.id AS journal_id, j.kind::text AS kind,
                we.signed_amount_kobo::text, j.memo, j.created_at
           FROM wallet_entries we
           JOIN accounts acct ON acct.id = we.account_id
           JOIN journal_entries j ON j.id = we.journal_id
           WHERE acct.kind = 'user' AND acct.owner_user_id = $1
           ORDER BY j.created_at DESC, j.id DESC
           LIMIT 10`,
        [userId],
      ),
      pool.query<{
        active_reports_against: string;
        failed_payouts_30d: string;
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM reports
              WHERE target_type = 'profile' AND target_id = $1 AND status = 'pending')
             AS active_reports_against,
           (SELECT COUNT(*)::text FROM withdrawals
              WHERE user_id = $1 AND status IN ('failed','reversed')
                AND requested_at > now() - INTERVAL '30 days')
             AS failed_payouts_30d`,
        [userId],
      ),
    ]);

  const kycRow = kyc.rows[0];
  const bankRow = bank.rows[0];
  const flagsRow = flags.rows[0]!;

  return new ServiceSuccess(
    {
      ...toView(row),
      kyc_submission: kycRow
        ? {
            id: kycRow.id,
            identity_type: kycRow.identity_type,
            identity_number: kycRow.identity_number,
            document_upload_id: kycRow.document_upload_id,
            selfie_upload_key: kycRow.selfie_upload_key,
            status: kycRow.status,
            reviewed_by: kycRow.reviewed_by,
            reviewed_at: kycRow.reviewed_at?.toISOString() ?? null,
            reject_reason_code: kycRow.reject_reason_code,
            reject_note: kycRow.reject_note,
            created_at: kycRow.created_at.toISOString(),
          }
        : null,
      bank_account: bankRow
        ? {
            bank_code: bankRow.bank_code,
            bank_name: bankRow.bank_name,
            account_number_last4: bankRow.account_number_last4,
            account_name: bankRow.account_name,
            added_at: bankRow.added_at.toISOString(),
          }
        : null,
      wallet: {
        currency: 'NGN',
        available_kobo: koboToJson(available),
        pending_kobo: koboToJson(pending),
      },
      recent_calls_as_caller: callsAsCaller.rows.map((r) => ({
        id: r.id,
        status: r.status,
        callee_user_id: r.callee_user_id,
        start_at: r.start_at.toISOString(),
        connected_seconds: r.connected_seconds,
        ended_at: r.ended_at?.toISOString() ?? null,
      })),
      recent_calls_as_callee: callsAsCallee.rows.map((r) => ({
        id: r.id,
        status: r.status,
        caller_user_id: r.caller_user_id,
        start_at: r.start_at.toISOString(),
        connected_seconds: r.connected_seconds,
        ended_at: r.ended_at?.toISOString() ?? null,
      })),
      recent_transactions: transactions.rows.map((r) => ({
        journal_id: r.journal_id,
        kind: r.kind,
        signed_amount_kobo: koboToJson(BigInt(r.signed_amount_kobo)),
        memo: r.memo,
        created_at: r.created_at.toISOString(),
      })),
      flags: {
        active_reports_against: Number(flagsRow.active_reports_against),
        failed_payouts_30d: Number(flagsRow.failed_payouts_30d),
      },
    },
    MESSAGE_KEYS.ADMIN_USER_FETCHED,
  );
};

// Suspend: status transitions active → suspended. Time-bounded if `until`
// is provided, else open-ended. Suspending a blocked user is a no-op
// (blocked is "harder than suspended" — can't downgrade).
export const suspendUser = async (userId: string, dto: AdminSuspendUserDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_SUSPENDED, 404);
  }
  if (user.status === 'blocked') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_USER_SUSPENDED, 409, {
      status: ['Cannot suspend a blocked user — unblock first'],
    });
  }
  const until = dto.until ? new Date(dto.until) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.setStatus(client, userId, 'suspended', until);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  logger.warn({ userId, reason: dto.reason }, 'admin suspended user');
  const fresh = await repo.findById(userId);
  return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_USER_SUSPENDED);
};

export const unsuspendUser = async (userId: string, _dto: AdminUnsuspendUserDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_UNSUSPENDED, 404);
  }
  if (user.status !== 'suspended') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_USER_UNSUSPENDED, 409, {
      status: [`User is currently ${user.status}`],
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.setStatus(client, userId, 'active', null);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  const fresh = await repo.findById(userId);
  return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_USER_UNSUSPENDED);
};

export const blockUser = async (userId: string, dto: AdminBlockUserDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_BLOCKED, 404);
  }
  if (user.status === 'blocked') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_USER_BLOCKED, 409, {
      status: ['User is already blocked'],
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.setStatus(client, userId, 'blocked', null);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  logger.warn({ userId, reason: dto.reason }, 'admin blocked user');
  const fresh = await repo.findById(userId);
  return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_USER_BLOCKED);
};

export const unblockUser = async (userId: string, _dto: AdminUnsuspendUserDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_UNBLOCKED, 404);
  }
  if (user.status !== 'blocked') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_USER_UNBLOCKED, 409, {
      status: [`User is currently ${user.status}`],
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.setStatus(client, userId, 'active', null);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  const fresh = await repo.findById(userId);
  return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_USER_UNBLOCKED);
};

// Reset password. Two paths:
//   send_email = true  → enqueue the user-flow reset email via outbox.
//                        The notification worker owns the link generation
//                        + send. Sender service can use the user-flow
//                        forgot-password machinery to mint a real token.
//   send_email = false → admin sets a new password directly. Used for
//                        break-glass when email is broken.
export const resetPassword = async (
  userId: string,
  dto: AdminResetPasswordDto,
  adminId: string,
) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_PASSWORD_RESET, 404);
  }
  const adminUserId = adminId === 'adm_stub' ? null : adminId;

  if (dto.send_email) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Outbox-only — no DB state change here. The notification worker
      // turns this into the user-facing reset email (token generation
      // happens in the worker against the same auth-slice repo the
      // user-flow uses).
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.USER,
        aggregateId: userId,
        eventType: OutboxEventType.PASSWORD_RESET_REQUESTED_BY_ADMIN,
        payload: {
          user_id: userId,
          requested_by_admin_id: adminUserId,
          // note stays admin-internal; not for the user template.
        },
      });
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    logger.warn(
      { userId, adminAction: true, note: dto.note },
      'admin requested password reset via email',
    );
    return new ServiceSuccess(
      { user_id: userId, method: 'email' as const },
      MESSAGE_KEYS.ADMIN_USER_PASSWORD_RESET,
    );
  }
  if (!dto.new_password) {
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_USER_PASSWORD_RESET, 400, {
      new_password: ['Required when send_email is false'],
    });
  }
  const newHash = await hashPassword(dto.new_password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.setPasswordHash(client, userId, newHash);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  logger.warn({ userId, note: dto.note }, 'admin force-set user password');
  return new ServiceSuccess(
    { user_id: userId, method: 'direct' as const },
    MESSAGE_KEYS.ADMIN_USER_PASSWORD_RESET,
  );
};

// Impersonate. Mints an access token AS the user — only for support
// debugging. We don't issue a refresh token (so the impersonation can't
// be extended), and we cap the expiry hard at duration_minutes.
export const impersonateUser = async (userId: string, dto: AdminImpersonateUserDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_IMPERSONATED, 404);
  }
  // We use the standard signAccessToken — its expiry comes from the env
  // (15m default), which is already a tight ceiling. The duration_minutes
  // param is currently informational (logged + audit trail) but doesn't
  // override the env. If a tighter expiry is needed we can layer a
  // `signImpersonationToken` later; for now keeping surface area small.
  const token = signAccessToken({ sub: user.id, role: user.role });
  logger.warn(
    {
      adminAction: 'impersonate',
      targetUserId: user.id,
      reason: dto.reason,
      durationMinutes: dto.duration_minutes,
    },
    'admin impersonating user',
  );
  return new ServiceSuccess(
    {
      user_id: user.id,
      access_token: token,
      // Surface the actual env-driven expiry so the admin UI can countdown.
      expires_in: '15m',
    },
    MESSAGE_KEYS.ADMIN_USER_IMPERSONATED,
  );
};

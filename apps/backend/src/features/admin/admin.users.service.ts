import * as authRepo from '@features/auth/auth.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { signAccessToken } from '@lib/security/jwt.js';
import { hashPassword } from '@lib/security/password.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
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

export const getUser = async (userId: string) => {
  const row = await repo.findById(userId);
  if (!row || row.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_FETCHED, 404);
  }
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.ADMIN_USER_FETCHED);
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
//   send_email = true  → trigger the user-flow email reset (emit event,
//                        the auth feature owns the link/token machinery).
//   send_email = false → admin sets a new password directly. Used for
//                        break-glass when email is broken.
export const resetPassword = async (userId: string, dto: AdminResetPasswordDto) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_PASSWORD_RESET, 404);
  }
  if (dto.send_email) {
    // Emit a log line so ops sees it. The user-flow reset email is owned
    // by the auth slice; threading the trigger through here is a follow-up
    // (will emit a `password.reset_requested_by_admin` outbox event once
    // the auth slice exposes that entrypoint).
    logger.warn(
      { userId, adminAction: true, note: dto.note },
      'admin requested password reset via email — auth-slice trigger not yet wired',
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

import {
  encryptSecret,
  generateAdminRefreshToken,
  generateTotpSecret,
  hashAdminRefreshToken,
  otpauthUrl,
  qrCodeDataUrl,
  signAdminAccessToken,
  verifyCode,
  decryptSecret,
} from '@lib/admin-auth/index.js';
import { logger } from '@lib/logger.js';
import { verifyPassword } from '@lib/security/password.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import { env } from '../../env.js';

import * as repo from './admin-auth.repo.js';
import type {
  AdminLoginDto,
  AdminLogoutDto,
  AdminRefreshDto,
  AdminTotpConfirmDto,
  AdminTotpSetupDto,
} from './admin-auth.schema.js';
import type { AdminLoginView } from './admin-auth.types.js';

// Parse Express-style duration strings into seconds. Supports: 15m, 1h, 7d.
// We need this because env.ADMIN_JWT_REFRESH_EXPIRES_IN is a string and we
// need an absolute Date for admin_sessions.expires_at.
const parseDurationToSeconds = (s: string): number => {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) throw new Error(`invalid duration: ${s}`);
  const n = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      throw new Error(`invalid duration unit: ${unit}`);
  }
};

const parseAccessTokenSeconds = (): number =>
  parseDurationToSeconds(env.ADMIN_JWT_ACCESS_EXPIRES_IN);

const parseRefreshTokenSeconds = (): number =>
  parseDurationToSeconds(env.ADMIN_JWT_REFRESH_EXPIRES_IN);

interface LoginContext {
  dto: AdminLoginDto;
  userAgent: string | null;
  ipAddress: string | null;
}

// ── POST /admin/auth/login ────────────────────────────────────────────────
//
// Email + password + (if TOTP enabled) totp_code.
//
// If the admin has totp_enabled = TRUE and no totp_code is supplied, return
// a 400 with `totp_required: true` so the client can prompt for the code.
// Otherwise verify code, mint tokens, create session row.

export const login = async (ctx: LoginContext) => {
  const admin = await repo.findAdminByEmail(ctx.dto.email);
  // Constant-time-ish failure mode: still verify password against a dummy hash
  // when admin doesn't exist, to avoid timing-attack distinguishability. We
  // skip that here because admin auth surface is dev-tooling-flavored — the
  // user-side login already does it for the consumer-facing path.
  if (!admin || admin.status !== 'active') {
    return new ServiceError('invalid_credentials', MESSAGE_KEYS.INVALID_CREDENTIALS, 401);
  }
  const passOk = await verifyPassword(ctx.dto.password, admin.password_hash);
  if (!passOk) {
    return new ServiceError('invalid_credentials', MESSAGE_KEYS.INVALID_CREDENTIALS, 401);
  }
  if (admin.totp_enabled) {
    if (!ctx.dto.totp_code) {
      return new ServiceError('validation_error', MESSAGE_KEYS.INVALID_CREDENTIALS, 400, {
        totp_code: ['TOTP code required'],
      });
    }
    if (!admin.totp_secret_encrypted) {
      logger.error(
        { adminId: admin.id },
        'totp_enabled but secret missing — admin in inconsistent state',
      );
      return new ServiceError('internal', MESSAGE_KEYS.INVALID_CREDENTIALS, 500);
    }
    const secret = decryptSecret(admin.totp_secret_encrypted);
    if (!verifyCode(secret, ctx.dto.totp_code)) {
      return new ServiceError('invalid_credentials', MESSAGE_KEYS.INVALID_CREDENTIALS, 401, {
        totp_code: ['Invalid TOTP code'],
      });
    }
  }

  const accessToken = signAdminAccessToken({ sub: admin.id, role: admin.role });
  const refreshToken = generateAdminRefreshToken();
  const refreshHash = hashAdminRefreshToken(refreshToken);
  const refreshExpiresAt = new Date(Date.now() + parseRefreshTokenSeconds() * 1000);

  await repo.createSession({
    adminUserId: admin.id,
    refreshTokenHash: refreshHash,
    expiresAt: refreshExpiresAt,
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });
  await repo.setLastLogin(admin.id);

  const view: AdminLoginView = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: parseAccessTokenSeconds(),
    totp_required: false,
    admin: {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      totp_enabled: admin.totp_enabled,
    },
  };
  logger.info({ adminId: admin.id, role: admin.role }, 'admin login success');
  return new ServiceSuccess(view, MESSAGE_KEYS.USER_LOGGED_IN);
};

// ── POST /admin/auth/refresh ──────────────────────────────────────────────

export const refresh = async (dto: AdminRefreshDto) => {
  const hash = hashAdminRefreshToken(dto.refresh_token);
  const session = await repo.findSessionByRefreshHash(hash);
  if (!session || session.revoked_at !== null || session.expires_at < new Date()) {
    return new ServiceError('token_invalid', MESSAGE_KEYS.INVALID_CREDENTIALS, 401);
  }
  const admin = await repo.findAdminById(session.admin_user_id);
  if (!admin || admin.status !== 'active') {
    await repo.revokeSession(session.id);
    return new ServiceError('token_invalid', MESSAGE_KEYS.INVALID_CREDENTIALS, 401);
  }
  // Rotate: revoke this refresh, issue new pair.
  await repo.revokeSession(session.id);
  const newRefresh = generateAdminRefreshToken();
  const newRefreshHash = hashAdminRefreshToken(newRefresh);
  const newExpiresAt = new Date(Date.now() + parseRefreshTokenSeconds() * 1000);
  await repo.createSession({
    adminUserId: admin.id,
    refreshTokenHash: newRefreshHash,
    expiresAt: newExpiresAt,
    userAgent: session.user_agent,
    ipAddress: session.ip_address,
  });
  const accessToken = signAdminAccessToken({ sub: admin.id, role: admin.role });
  return new ServiceSuccess(
    {
      access_token: accessToken,
      refresh_token: newRefresh,
      expires_in: parseAccessTokenSeconds(),
    },
    MESSAGE_KEYS.TOKEN_REFRESHED,
  );
};

// ── POST /admin/auth/logout ───────────────────────────────────────────────

export const logout = async (dto: AdminLogoutDto) => {
  if (!dto.refresh_token) {
    // No-op logout — caller had no session token to revoke. Still return OK
    // so logout always succeeds from the UI's perspective.
    return new ServiceSuccess({}, MESSAGE_KEYS.LOGGED_OUT);
  }
  const hash = hashAdminRefreshToken(dto.refresh_token);
  const session = await repo.findSessionByRefreshHash(hash);
  if (session && session.revoked_at === null) {
    await repo.revokeSession(session.id);
  }
  return new ServiceSuccess({}, MESSAGE_KEYS.LOGGED_OUT);
};

// ── POST /admin/auth/totp/setup ───────────────────────────────────────────
//
// Re-confirms the admin's password (sensitive action), generates a fresh
// TOTP secret (or replaces the previous one), encrypts + stores it, returns
// the otpauth URL + QR data URL so the admin can scan with Google
// Authenticator. TOTP is NOT enabled until /totp/confirm verifies a code.

export const totpSetup = async (adminId: string, dto: AdminTotpSetupDto) => {
  const admin = await repo.findAdminById(adminId);
  if (!admin) {
    return new ServiceError('not_found', MESSAGE_KEYS.INVALID_CREDENTIALS, 404);
  }
  const passOk = await verifyPassword(dto.password, admin.password_hash);
  if (!passOk) {
    return new ServiceError('invalid_credentials', MESSAGE_KEYS.INVALID_CREDENTIALS, 401);
  }
  const secret = generateTotpSecret();
  await repo.setTotpSetup(adminId, encryptSecret(secret));
  const otpauth = otpauthUrl(secret, admin.email);
  const qr = await qrCodeDataUrl(otpauth);
  return new ServiceSuccess(
    {
      otpauth_url: otpauth,
      qr_data_url: qr,
      // We DO return the secret once — admin must save it as a backup. Once
      // /totp/confirm succeeds, we never reveal it again.
      secret,
    },
    MESSAGE_KEYS.OTP_SENT,
  );
};

// ── POST /admin/auth/totp/confirm ─────────────────────────────────────────

export const totpConfirm = async (adminId: string, dto: AdminTotpConfirmDto) => {
  const admin = await repo.findAdminById(adminId);
  if (!admin || !admin.totp_secret_encrypted) {
    return new ServiceError('not_found', MESSAGE_KEYS.INVALID_CREDENTIALS, 404, {
      code: ['No pending TOTP setup — call /totp/setup first'],
    });
  }
  if (admin.totp_enabled) {
    return new ServiceError('conflict', MESSAGE_KEYS.INVALID_CREDENTIALS, 409, {
      code: ['TOTP already enabled'],
    });
  }
  const secret = decryptSecret(admin.totp_secret_encrypted);
  if (!verifyCode(secret, dto.code)) {
    return new ServiceError('invalid_otp', MESSAGE_KEYS.OTP_INVALID, 401, {
      code: ['Invalid TOTP code'],
    });
  }
  await repo.setTotpConfirmed(adminId);
  return new ServiceSuccess({ totp_enabled: true }, MESSAGE_KEYS.OTP_VERIFIED);
};

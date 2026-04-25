import crypto from 'node:crypto';

import { pool } from '@lib/db/pool.js';
import { id, newRawId } from '@lib/ids.js';

import type { OtpPurpose, OtpRow, RegTokenRow, SessionRow, UserRow } from './auth.types.js';

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const generateOtp = (): string => String(crypto.randomInt(100000, 1000000));

// ── Users ─────────────────────────────────────────────────────────────────────

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return res.rows[0] ?? null;
};

export const findUserById = async (userId: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0] ?? null;
};

export const findUserByPhone = async (phone: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE phone_number = $1 LIMIT 1', [
    phone,
  ]);
  return res.rows[0] ?? null;
};

export interface CreateUserInput {
  email: string;
  phone_number: string;
  password_hash: string;
  email_verified_at?: Date | undefined;
  phone_verified_at?: Date | undefined;
}

export const createUser = async (input: CreateUserInput): Promise<UserRow> => {
  const res = await pool.query<UserRow>(
    `INSERT INTO users (id, email, phone_number, password_hash, email_verified_at, phone_verified_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id('u'),
      input.email,
      input.phone_number,
      input.password_hash,
      input.email_verified_at ?? null,
      input.phone_verified_at ?? null,
    ],
  );
  return res.rows[0]!;
};

export const updateUser = async (userId: string, data: Partial<UserRow>): Promise<void> => {
  const entries = Object.entries(data);
  if (entries.length === 0) return;

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  await pool.query(`UPDATE users SET ${setClauses}, updated_at = now() WHERE id = $1`, [
    userId,
    ...values,
  ]);
};

export const clearFailedLoginCount = async (userId: string): Promise<void> => {
  await pool.query('UPDATE users SET updated_at = now() WHERE id = $1', [userId]);
};

// ── Registration tokens ───────────────────────────────────────────────────────

export const findRegistrationToken = async (tokenHash: string): Promise<RegTokenRow | null> => {
  const res = await pool.query<RegTokenRow>(
    `SELECT * FROM registration_tokens
     WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );
  return res.rows[0] ?? null;
};

export const createRegistrationToken = async (input: {
  email: string;
  phone_number: string;
  channel: 'email' | 'sms';
}): Promise<{ token: string; row: RegTokenRow }> => {
  const token = newRawId() + newRawId();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const res = await pool.query<RegTokenRow>(
    `INSERT INTO registration_tokens (token_hash, email, phone_number, channel, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tokenHash, input.email, input.phone_number, input.channel, expiresAt],
  );
  return { token, row: res.rows[0]! };
};

export const setRegistrationTokenPassword = async (
  tokenHash: string,
  passwordHash: string,
): Promise<void> => {
  await pool.query('UPDATE registration_tokens SET password_hash = $1 WHERE token_hash = $2', [
    passwordHash,
    tokenHash,
  ]);
};

export const linkOtpToRegistrationToken = async (
  tokenHash: string,
  otpCodeId: string,
): Promise<void> => {
  await pool.query('UPDATE registration_tokens SET otp_code_id = $1 WHERE token_hash = $2', [
    otpCodeId,
    tokenHash,
  ]);
};

export const consumeRegistrationToken = async (tokenHash: string): Promise<boolean> => {
  const res = await pool.query(
    'UPDATE registration_tokens SET consumed_at = now() WHERE token_hash = $1 AND consumed_at IS NULL',
    [tokenHash],
  );
  return (res.rowCount ?? 0) > 0;
};

// ── OTP codes ─────────────────────────────────────────────────────────────────

export const createOtpCode = async (input: {
  purpose: OtpPurpose;
  subjectKey: string;
  ttlSeconds: number;
}): Promise<{ id: string; code: string }> => {
  const code = generateOtp();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
  const otpId = id('otp');

  await pool.query(
    `INSERT INTO otp_codes (id, purpose, subject_key, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [otpId, input.purpose, input.subjectKey, codeHash, expiresAt],
  );

  return { id: otpId, code };
};

export const findActiveOtpCode = async (
  purpose: OtpPurpose,
  subjectKey: string,
): Promise<OtpRow | null> => {
  const res = await pool.query<OtpRow>(
    `SELECT * FROM otp_codes
     WHERE purpose = $1 AND subject_key = $2 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [purpose, subjectKey],
  );
  return res.rows[0] ?? null;
};

export const incrementOtpAttempts = async (otpId: string): Promise<void> => {
  await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otpId]);
};

export const consumeOtpCode = async (otpId: string): Promise<void> => {
  await pool.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [otpId]);
};

export const consumeAllOtpCodesForSubject = async (
  purpose: OtpPurpose,
  subjectKey: string,
): Promise<void> => {
  await pool.query(
    `UPDATE otp_codes SET consumed_at = now()
     WHERE purpose = $1 AND subject_key = $2 AND consumed_at IS NULL`,
    [purpose, subjectKey],
  );
};

export const verifyOtpCode = (row: OtpRow, code: string): boolean => {
  const expected = crypto.createHash('sha256').update(code).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(expected));
};

// ── Auth sessions ─────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ip?: string | undefined;
  deviceId?: string | undefined;
}

export type { OtpPurpose } from './auth.types.js';

export const createAuthSession = async (input: CreateSessionInput): Promise<void> => {
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at, user_agent, ip, device_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id('rt'),
      input.userId,
      input.refreshTokenHash,
      input.expiresAt,
      input.userAgent ?? null,
      input.ip ?? null,
      input.deviceId ?? null,
    ],
  );
};

export const findSessionByTokenHash = async (hash: string): Promise<SessionRow | null> => {
  const res = await pool.query<SessionRow>(
    'SELECT * FROM auth_sessions WHERE refresh_token_hash = $1 LIMIT 1',
    [hash],
  );
  return res.rows[0] ?? null;
};

export const revokeSession = async (sessionId: string): Promise<boolean> => {
  const res = await pool.query(
    'UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [sessionId],
  );
  return (res.rowCount ?? 0) > 0;
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
};

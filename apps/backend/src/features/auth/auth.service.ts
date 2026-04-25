import crypto from 'node:crypto';

import { logger } from '@lib/logger.js';
import { notificationService } from '@lib/notifications/notification.service.js';
import { redis } from '@lib/redis/client.js';
import { generateRefreshToken, hashToken, signAccessToken } from '@lib/security/jwt.js';
import { hashPassword, verifyPassword } from '@lib/security/password.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { AUTH_MESSAGES } from './auth.messages.js';
import * as repo from './auth.repo.js';
import type {
  ChangePasswordDto,
  ForgotPasswordInitiateDto,
  ForgotPasswordResetDto,
  ForgotPasswordVerifyOtpDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterInitiateDto,
  RegisterSetPasswordDto,
  RegisterVerifyDto,
  ResendOtpDto,
  SensitiveActionOtpDto,
} from './auth.schema.js';
import type { OtpPurpose, TokenPair, UserRow } from './auth.types.js';

const OTP_TTL_SECONDS = 10 * 60;
const OTP_EXPIRES_IN_MINUTES = 10;
const REFRESH_TOKEN_TTL_DAYS = 30;
const LOGIN_LOCK_WINDOW = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60;
const RESEND_MAX_PER_HOUR = 5;

const generateOtp = (): string => String(crypto.randomInt(100000, 1000000));

const mintTokens = async (
  user: UserRow,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
): Promise<TokenPair> => {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await repo.createAuthSession({
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    ...(meta.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
    ...(meta.ip !== undefined ? { ip: meta.ip } : {}),
  });

  return { access_token: accessToken, refresh_token: refreshToken, expires_in: 15 * 60 };
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
};

const maskPhone = (phone: string): string => `${phone.slice(0, 4)}***${phone.slice(-2)}`;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

// ── Register ──────────────────────────────────────────────────────────────────

export const registerInitiate = async (dto: RegisterInitiateDto) => {
  const [existingEmail, existingPhone] = await Promise.all([
    repo.findUserByEmail(dto.email),
    repo.findUserByPhone(dto.phone),
  ]);
  if (existingEmail) {
    return new ServiceError('email_exists', AUTH_MESSAGES.REGISTER_INITIATED, 409);
  }
  if (existingPhone) {
    return new ServiceError('phone_exists', AUTH_MESSAGES.REGISTER_INITIATED, 409);
  }

  const { token } = await repo.createRegistrationToken({
    email: dto.email,
    phone_number: dto.phone,
    channel: dto.channel,
  });

  const tokenHash = sha256(token);
  const { id: otpId, code } = await repo.createOtpCode({
    purpose: 'register',
    subjectKey: tokenHash,
    ttlSeconds: OTP_TTL_SECONDS,
  });

  await repo.linkOtpToRegistrationToken(tokenHash, otpId);
  await redis.setex(`otp:${tokenHash}`, OTP_TTL_SECONDS, sha256(code));

  const destination = dto.channel === 'email' ? dto.email : dto.phone;
  const masked = dto.channel === 'email' ? maskEmail(dto.email) : maskPhone(dto.phone);

  if (dto.channel === 'email') {
    await notificationService.sendEmailOtp(destination, code, 'register', OTP_EXPIRES_IN_MINUTES);
  } else {
    notificationService.sendSmsOtp(destination, code, 'register');
  }

  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN * 1000).toISOString();

  return new ServiceSuccess(
    {
      registration_token: token,
      otp_destination_masked: masked,
      resend_available_at: resendAvailableAt,
    },
    AUTH_MESSAGES.REGISTER_INITIATED,
  );
};

export const registerSetPassword = async (dto: RegisterSetPasswordDto) => {
  const tokenHash = sha256(dto.registration_token);
  const row = await repo.findRegistrationToken(tokenHash);
  if (!row) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.OTP_SENT, 404);
  }

  const credentialHash = await hashPassword(dto.password);
  await repo.setRegistrationTokenPassword(tokenHash, credentialHash);

  return new ServiceSuccess(null, AUTH_MESSAGES.REGISTER_SET_CREDENTIAL);
};

export const registerVerify = async (
  dto: RegisterVerifyDto,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
) => {
  const tokenHash = sha256(dto.registration_token);
  const regToken = await repo.findRegistrationToken(tokenHash);
  if (!regToken) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.OTP_SENT, 404);
  }

  if (!regToken.password_hash) {
    return new ServiceError('credential_not_set', AUTH_MESSAGES.REGISTER_SET_CREDENTIAL, 400);
  }

  const verified = await verifyOtp(tokenHash, dto.otp, 'register');
  if (!verified.ok) return verified.error;

  const consumed = await repo.consumeRegistrationToken(tokenHash);
  if (!consumed) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.OTP_SENT, 409);
  }

  const now = new Date();
  const user = await repo.createUser({
    email: regToken.email,
    phone_number: regToken.phone_number,
    password_hash: regToken.password_hash,
    ...(regToken.channel === 'email' ? { email_verified_at: now } : { phone_verified_at: now }),
  });

  const tokens = await mintTokens(user, meta);

  notificationService.sendWelcomeEmail(user.email, user.full_name ?? '').catch((err: unknown) => {
    logger.error({ err }, 'welcome email failed');
  });

  return new ServiceSuccess(
    {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
      onboarding_step: 'profile',
    },
    AUTH_MESSAGES.USER_REGISTERED,
  );
};

export const resendOtp = async (dto: ResendOtpDto) => {
  const tokenHash = sha256(dto.registration_token);
  const regToken = await repo.findRegistrationToken(tokenHash);
  if (!regToken) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.OTP_SENT, 404);
  }

  const resendKey = `resend:${tokenHash}`;
  const count = await redis.incr(resendKey);
  if (count === 1) await redis.expire(resendKey, 3600);

  if (count > RESEND_MAX_PER_HOUR) {
    const ttl = await redis.ttl(resendKey);
    return new ServiceError(
      'rate_limited',
      AUTH_MESSAGES.OTP_RESENT,
      429,
      undefined,
      ttl > 0 ? ttl : 3600,
    );
  }

  await repo.consumeAllOtpCodesForSubject('register', tokenHash);

  const { id: otpId, code } = await repo.createOtpCode({
    purpose: 'register',
    subjectKey: tokenHash,
    ttlSeconds: OTP_TTL_SECONDS,
  });

  await repo.linkOtpToRegistrationToken(tokenHash, otpId);
  await redis.setex(`otp:${tokenHash}`, OTP_TTL_SECONDS, sha256(code));

  const destination = regToken.channel === 'email' ? regToken.email : regToken.phone_number;
  if (regToken.channel === 'email') {
    await notificationService.sendEmailOtp(destination, code, 'register', OTP_EXPIRES_IN_MINUTES);
  } else {
    notificationService.sendSmsOtp(destination, code, 'register');
  }

  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN * 1000).toISOString();
  return new ServiceSuccess({ resend_available_at: resendAvailableAt }, AUTH_MESSAGES.OTP_RESENT);
};

// ── Login ─────────────────────────────────────────────────────────────────────

const DUMMY_CREDENTIAL =
  '$argon2id$v=19$m=65536,t=3,p=1$dummysaltdummysaltdummysalt$dummyhashvaluedummyhashvaluedummyhashvalue';

export const login = async (
  dto: LoginDto,
  meta: { ip?: string | undefined; userAgent?: string | undefined },
) => {
  const ipKey = `login-ip:${meta.ip ?? 'unknown'}`;
  const emailKey = `login-email:${dto.email.toLowerCase()}`;
  const lockKey = `account-locked:${dto.email.toLowerCase()}`;

  const [ipCount, locked] = await Promise.all([redis.incr(ipKey), redis.get(lockKey)]);

  if (ipCount === 1) await redis.expire(ipKey, 15 * 60);
  if (ipCount > 20) {
    return new ServiceError('rate_limited', AUTH_MESSAGES.USER_LOGGED_IN, 429, undefined, 15 * 60);
  }

  if (locked) {
    const ttl = await redis.ttl(lockKey);
    return new ServiceError(
      'account_locked',
      AUTH_MESSAGES.INVALID_CREDENTIALS,
      401,
      undefined,
      ttl > 0 ? ttl : LOGIN_LOCK_WINDOW,
    );
  }

  const user = await repo.findUserByEmail(dto.email);
  const hashToVerify = user?.password_hash ?? DUMMY_CREDENTIAL;
  const credentialValid = await verifyPassword(dto.password, hashToVerify);

  if (!user || !credentialValid) {
    const failCount = await redis.incr(emailKey);
    if (failCount === 1) await redis.expire(emailKey, LOGIN_LOCK_WINDOW);

    if (failCount >= LOGIN_MAX_ATTEMPTS) {
      await redis.setex(lockKey, LOGIN_LOCK_WINDOW, '1');
      return new ServiceError(
        'account_locked',
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        401,
        undefined,
        LOGIN_LOCK_WINDOW,
      );
    }

    return new ServiceError('invalid_credentials', AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
  }

  if (user.status === 'suspended') {
    return new ServiceError('account_suspended', AUTH_MESSAGES.INVALID_CREDENTIALS, 403);
  }
  if (user.status === 'blocked' || user.status === 'deleted') {
    return new ServiceError('account_blocked', AUTH_MESSAGES.INVALID_CREDENTIALS, 403);
  }

  await redis.del(emailKey);
  const tokens = await mintTokens(user, meta);

  return new ServiceSuccess(
    {
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      ...tokens,
      onboarding_step: user.full_name ? 'complete' : 'profile',
    },
    AUTH_MESSAGES.USER_LOGGED_IN,
  );
};

// ── Refresh ───────────────────────────────────────────────────────────────────

export const refresh = async (
  dto: RefreshDto,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
) => {
  const tokenHash = hashToken(dto.refresh_token);
  const session = await repo.findSessionByTokenHash(tokenHash);

  if (!session) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.TOKEN_REFRESHED, 401);
  }

  if (session.revoked_at !== null) {
    logger.warn(
      { userId: session.user_id },
      'refresh token reuse detected — revoking all sessions',
    );
    await repo.revokeAllUserSessions(session.user_id);
    return new ServiceError('session_revoked', AUTH_MESSAGES.TOKEN_REFRESHED, 401);
  }

  if (session.expires_at < new Date()) {
    return new ServiceError('session_expired', AUTH_MESSAGES.TOKEN_REFRESHED, 401);
  }

  const revoked = await repo.revokeSession(session.id);
  if (!revoked) {
    return new ServiceError('session_revoked', AUTH_MESSAGES.TOKEN_REFRESHED, 401);
  }

  const user = await repo.findUserById(session.user_id);
  if (!user) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.TOKEN_REFRESHED, 401);
  }

  const tokens = await mintTokens(user, meta);
  return new ServiceSuccess(tokens, AUTH_MESSAGES.TOKEN_REFRESHED);
};

// ── Logout ────────────────────────────────────────────────────────────────────

export const logout = async (dto: LogoutDto, userId: string) => {
  const tokenHash = hashToken(dto.refresh_token);
  const session = await repo.findSessionByTokenHash(tokenHash);

  if (session && session.user_id === userId && session.revoked_at === null) {
    await repo.revokeSession(session.id);
  }

  return new ServiceSuccess(null, AUTH_MESSAGES.LOGGED_OUT);
};

// ── Forgot credential ─────────────────────────────────────────────────────────

export const forgotPasswordInitiate = async (dto: ForgotPasswordInitiateDto) => {
  const user = await repo.findUserByEmail(dto.email);

  if (user) {
    const { code } = await repo.createOtpCode({
      purpose: 'forgot_password',
      subjectKey: dto.email.toLowerCase(),
      ttlSeconds: OTP_TTL_SECONDS,
    });
    await redis.setex(`otp:fp:${dto.email.toLowerCase()}`, OTP_TTL_SECONDS, sha256(code));
    await notificationService.sendEmailOtp(
      dto.email,
      code,
      'forgot_password',
      OTP_EXPIRES_IN_MINUTES,
    );
  } else {
    // Constant-time stub: match the ~1ms DB write overhead so timing doesn't reveal email existence.
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return new ServiceSuccess(null, AUTH_MESSAGES.OTP_SENT);
};

export const forgotPasswordVerifyOtp = async (dto: ForgotPasswordVerifyOtpDto) => {
  const subjectKey = dto.email.toLowerCase();
  const verified = await verifyOtp(subjectKey, dto.otp, 'forgot_password');
  if (!verified.ok) return verified.error;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetHash = sha256(resetToken);
  await redis.setex(`pw-reset:${resetHash}`, 10 * 60, subjectKey);

  return new ServiceSuccess({ reset_token: resetToken }, AUTH_MESSAGES.OTP_VERIFIED);
};

export const forgotPasswordReset = async (dto: ForgotPasswordResetDto) => {
  const resetHash = sha256(dto.reset_token);
  const email = await redis.get(`pw-reset:${resetHash}`);

  if (!email) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.CREDENTIAL_RESET, 401);
  }

  const user = await repo.findUserByEmail(email);
  if (!user) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.CREDENTIAL_RESET, 401);
  }

  const credentialHash = await hashPassword(dto.new_password);
  await repo.updateUser(user.id, { password_hash: credentialHash });
  await repo.revokeAllUserSessions(user.id);
  await redis.del(`pw-reset:${resetHash}`);

  return new ServiceSuccess(null, AUTH_MESSAGES.CREDENTIAL_RESET);
};

// ── Change credential (sensitive-action gated) ────────────────────────────────

export const changePassword = async (dto: ChangePasswordDto, userId: string) => {
  const saOtpKey = `sa-otp:${userId}:change_password`;
  const storedHash = await redis.get(saOtpKey);

  if (!storedHash) {
    return new ServiceError('invalid_otp', AUTH_MESSAGES.SENSITIVE_OTP_SENT, 401);
  }

  const providedHash = sha256(dto.otp);
  if (!crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash))) {
    return new ServiceError('invalid_otp', AUTH_MESSAGES.SENSITIVE_OTP_SENT, 401);
  }

  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.CREDENTIAL_CHANGED, 401);
  }

  const currentValid = await verifyPassword(dto.current_password, user.password_hash);
  if (!currentValid) {
    return new ServiceError('invalid_credentials', AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
  }

  const newCredentialHash = await hashPassword(dto.new_password);
  await repo.updateUser(userId, { password_hash: newCredentialHash });
  await repo.revokeAllUserSessions(userId);
  await redis.del(saOtpKey);

  return new ServiceSuccess(null, AUTH_MESSAGES.CREDENTIAL_CHANGED);
};

// ── Sensitive action OTP ───────────────────────────────────────────────────────

export const requestSensitiveActionOtp = async (dto: SensitiveActionOtpDto, userId: string) => {
  const rateKey = `sa-otp-rate:${userId}:${dto.action}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 3600);
  if (count > 5) {
    const ttl = await redis.ttl(rateKey);
    return new ServiceError(
      'rate_limited',
      AUTH_MESSAGES.SENSITIVE_OTP_SENT,
      429,
      undefined,
      ttl > 0 ? ttl : 3600,
    );
  }

  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', AUTH_MESSAGES.SENSITIVE_OTP_SENT, 401);
  }

  const otp = generateOtp();
  const otpHash = sha256(otp);
  const saOtpKey = `sa-otp:${userId}:${dto.action}`;
  await redis.setex(saOtpKey, 10 * 60, otpHash);

  const usePhone = dto.action === 'change_phone';
  const destination = usePhone ? user.phone_number : user.email;
  const purpose = dto.action;
  const masked = usePhone ? maskPhone(user.phone_number) : maskEmail(user.email);

  if (usePhone) {
    notificationService.sendSmsOtp(destination, otp, purpose);
  } else {
    await notificationService.sendEmailOtp(destination, otp, purpose, 10);
  }

  return new ServiceSuccess({ otp_destination_masked: masked }, AUTH_MESSAGES.SENSITIVE_OTP_SENT);
};

// ── Internal: OTP verification helper ────────────────────────────────────────

type VerifyOtpResult = { ok: true } | { ok: false; error: ServiceError };

const verifyOtp = async (
  subjectKey: string,
  code: string,
  purpose: OtpPurpose,
): Promise<VerifyOtpResult> => {
  const redisKey = purpose === 'forgot_password' ? `otp:fp:${subjectKey}` : `otp:${subjectKey}`;

  const cachedHash = await redis.get(redisKey);
  const providedHash = sha256(code);

  if (cachedHash) {
    const valid = crypto.timingSafeEqual(Buffer.from(cachedHash), Buffer.from(providedHash));
    if (valid) {
      await redis.del(redisKey);
      const dbRow = await repo.findActiveOtpCode(purpose, subjectKey);
      if (dbRow) await repo.consumeOtpCode(dbRow.id);
      return { ok: true };
    }
  }

  const dbRow = await repo.findActiveOtpCode(purpose, subjectKey);

  if (!dbRow) {
    return { ok: false, error: new ServiceError('invalid_otp', AUTH_MESSAGES.OTP_SENT, 400) };
  }

  if (dbRow.expires_at < new Date()) {
    return { ok: false, error: new ServiceError('otp_expired', AUTH_MESSAGES.OTP_SENT, 400) };
  }

  if (!repo.verifyOtpCode(dbRow, code)) {
    await repo.incrementOtpAttempts(dbRow.id);
    if (dbRow.attempts + 1 >= dbRow.max_attempts) {
      return {
        ok: false,
        error: new ServiceError('otp_max_attempts', AUTH_MESSAGES.OTP_SENT, 429),
      };
    }
    return { ok: false, error: new ServiceError('invalid_otp', AUTH_MESSAGES.OTP_SENT, 400) };
  }

  await repo.consumeOtpCode(dbRow.id);
  return { ok: true };
};

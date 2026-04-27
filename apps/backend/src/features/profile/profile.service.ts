import crypto from 'node:crypto';

import type { UserRow } from '@features/auth/auth.types.js';
import * as onboardingService from '@features/onboarding/onboarding.service.js';
import { invalidateProfessionalCaches } from '@features/professionals/professionals.cache.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { newRawId } from '@lib/ids.js';
import { logger } from '@lib/logger.js';
import { notificationService } from '@lib/notifications/notification.service.js';
import {
  PaystackUnresolvableError,
  PaystackUpstreamError,
  resolveBankAccountCached,
} from '@lib/paystack/resolve-cached.js';
import { redis } from '@lib/redis/client.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { nameSimilarityPercent } from '@lib/util/string-similarity.js';

import { PROFILE_MESSAGES } from './profile.messages.js';
import * as repo from './profile.repo.js';
import type {
  ChangeEmailDto,
  ChangePhoneDto,
  DeleteAccountDto,
  NotificationPreferencesPatchDto,
  PatchMeDto,
  PostAvatarDto,
  PutBankAccountDto,
  VerifyOtpOnlyDto,
} from './profile.schema.js';
import type {
  BankAccountRow,
  BankAccountView,
  MeView,
  NotificationPreferencesRow,
  NotificationPreferencesView,
} from './profile.types.js';

const EMAIL_VERIFY_OTP_TTL = 10 * 60;
const PHONE_VERIFY_OTP_TTL = 10 * 60;
const SHARE_SLUG_SUFFIX_LEN = 6;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const generateOtp = (): string => String(crypto.randomInt(100000, 1000000));

const maskAccount = (acct: string): string => (acct.length <= 4 ? '***' : `***${acct.slice(-4)}`);

const buildShareSlug = (handle: string | null, userId: string): string | null => {
  if (!handle) return null;
  // Stable, derived from user id so slug doesn't change on each request.
  const suffix = sha256(userId).slice(0, SHARE_SLUG_SUFFIX_LEN);
  return `${handle}-${suffix}`;
};

const toMeView = async (user: UserRow): Promise<MeView> => {
  const agg = await repo.findReviewAggregate(user.id);
  return {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    email_verified: user.email_verified_at !== null,
    phone_number: user.phone_number,
    phone_verified: user.phone_verified_at !== null,
    handle: user.handle,
    share_slug: buildShareSlug(user.handle, user.id),
    avatar_url: user.avatar_url,
    cover_photo_url: user.cover_photo_url,
    occupation: user.occupation,
    description: user.description,
    interests: user.interests,
    categories: user.categories,
    is_available: user.is_available,
    rating: agg.rating,
    review_count: agg.review_count,
    kyc_status: user.kyc_status,
    created_at: user.created_at.toISOString(),
  };
};

const toPrefsView = (row: NotificationPreferencesRow): NotificationPreferencesView => ({
  sms: { enabled: row.sms_enabled, updated_at: row.sms_updated_at.toISOString() },
  email: { enabled: row.email_enabled, updated_at: row.email_updated_at.toISOString() },
  push: { enabled: row.push_enabled, updated_at: row.push_updated_at.toISOString() },
});

const toBankView = (row: BankAccountRow): BankAccountView => ({
  account_number: row.account_number,
  account_number_masked: maskAccount(row.account_number),
  bank_code: row.bank_code,
  bank_name: row.bank_name,
  account_name: row.account_name,
  added_at: row.added_at.toISOString(),
});

// ── GET /me ──────────────────────────────────────────────────────────────────

export const getMe = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.PROFILE_FETCHED, 401);
  }
  const view = await toMeView(user);
  return new ServiceSuccess(view, PROFILE_MESSAGES.PROFILE_FETCHED);
};

// ── PATCH /me ────────────────────────────────────────────────────────────────

const validatePatchMe = async (dto: PatchMeDto, user: UserRow): Promise<ServiceError | null> => {
  // is_available + categories restricted to professionals.
  if (dto.is_available !== undefined && user.role !== 'professional') {
    return new ServiceError('forbidden', PROFILE_MESSAGES.PROFILE_UPDATED, 403);
  }
  if (dto.categories !== undefined && user.role !== 'professional') {
    return new ServiceError('forbidden', PROFILE_MESSAGES.PROFILE_UPDATED, 403);
  }
  // Handle changes via PATCH /me are not allowed — must use POST /me/handle (cooldown enforced there).
  if (dto.handle !== undefined && dto.handle !== user.handle) {
    return new ServiceError('forbidden', PROFILE_MESSAGES.PROFILE_UPDATED, 403);
  }
  // Validate categories against the seeded professional_categories table.
  if (dto.categories !== undefined && dto.categories.length > 0) {
    const unknown = await repo.findInvalidCategoryValues(dto.categories);
    if (unknown.length > 0) {
      return new ServiceError('category_invalid', PROFILE_MESSAGES.PROFILE_UPDATED, 422, {
        categories: [`Unknown category values: ${unknown.join(', ')}`],
      });
    }
  }
  return null;
};

const buildPatchMeUpdates = (dto: PatchMeDto): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  if (dto.full_name !== undefined) updates['full_name'] = dto.full_name;
  if (dto.description !== undefined) updates['description'] = dto.description;
  if (dto.occupation !== undefined) updates['occupation'] = dto.occupation;
  if (dto.interests !== undefined) updates['interests'] = dto.interests;
  if (dto.is_available !== undefined) updates['is_available'] = dto.is_available;
  if (dto.categories !== undefined) updates['categories'] = dto.categories;
  return updates;
};

export const patchMe = async (dto: PatchMeDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.PROFILE_UPDATED, 401);
  }

  const validationErr = await validatePatchMe(dto, user);
  if (validationErr !== null) return validationErr;

  const updates = buildPatchMeUpdates(dto);
  const updated = (await repo.updateUserFields(userId, updates)) ?? user;
  // Bust per-pro caches when fields surfaced by /professionals change.
  if (user.role === 'professional') {
    await invalidateProfessionalCaches(userId);
  }
  const view = await toMeView(updated);
  return new ServiceSuccess(view, PROFILE_MESSAGES.PROFILE_UPDATED);
};

// ── POST /me/email (sensitive-action OTP gated) ──────────────────────────────

const consumeSensitiveOtp = async (
  userId: string,
  action: 'change_email' | 'change_phone' | 'delete_account',
  otp: string,
): Promise<boolean> => {
  const key = `sa-otp:${userId}:${action}`;
  const storedHash = await redis.get(key);
  if (!storedHash) return false;
  const providedHash = sha256(otp);
  if (
    storedHash.length !== providedHash.length ||
    !crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash))
  ) {
    return false;
  }
  await redis.del(key);
  return true;
};

export const changeEmail = async (dto: ChangeEmailDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.EMAIL_CHANGE_INITIATED, 401);
  }

  const otpOk = await consumeSensitiveOtp(userId, 'change_email', dto.otp);
  if (!otpOk) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }

  if (dto.new_email.toLowerCase() === user.email.toLowerCase()) {
    return new ServiceError('validation_error', PROFILE_MESSAGES.EMAIL_CHANGE_INITIATED, 400, {
      new_email: ['new_email must differ from the current email'],
    });
  }

  const taken = await repo.findUserByEmail(dto.new_email);
  if (taken !== null && taken.id !== userId) {
    return new ServiceError('email_exists', PROFILE_MESSAGES.EMAIL_CHANGE_INITIATED, 409);
  }

  await repo.updateUserFields(userId, {
    email: dto.new_email,
    email_verified_at: null,
  });

  // Send verification OTP to the NEW email. Stored under email-verify key.
  const verifyOtp = generateOtp();
  await redis.setex(`email-verify:${userId}`, EMAIL_VERIFY_OTP_TTL, sha256(verifyOtp));
  await notificationService.sendEmailOtp(
    dto.new_email,
    verifyOtp,
    'change_email',
    EMAIL_VERIFY_OTP_TTL / 60,
  );

  return new ServiceSuccess(
    { email: dto.new_email, email_verified: false },
    PROFILE_MESSAGES.EMAIL_CHANGE_INITIATED,
  );
};

export const verifyEmail = async (dto: VerifyOtpOnlyDto, userId: string) => {
  const key = `email-verify:${userId}`;
  const storedHash = await redis.get(key);
  if (!storedHash) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }
  const providedHash = sha256(dto.otp);
  if (
    storedHash.length !== providedHash.length ||
    !crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash))
  ) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }

  await repo.updateUserFields(userId, { email_verified_at: new Date() });
  await redis.del(key);

  return new ServiceSuccess(null, PROFILE_MESSAGES.EMAIL_VERIFIED);
};

// ── POST /me/phone (sensitive-action OTP gated) ──────────────────────────────

export const changePhone = async (dto: ChangePhoneDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.PHONE_CHANGE_INITIATED, 401);
  }

  const otpOk = await consumeSensitiveOtp(userId, 'change_phone', dto.otp);
  if (!otpOk) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }

  if (dto.new_phone_number === user.phone_number) {
    return new ServiceError('validation_error', PROFILE_MESSAGES.PHONE_CHANGE_INITIATED, 400, {
      new_phone_number: ['new_phone_number must differ from the current phone'],
    });
  }

  const taken = await repo.findUserByPhone(dto.new_phone_number);
  if (taken !== null && taken.id !== userId) {
    return new ServiceError('phone_exists', PROFILE_MESSAGES.PHONE_CHANGE_INITIATED, 409);
  }

  await repo.updateUserFields(userId, {
    phone_number: dto.new_phone_number,
    phone_verified_at: null,
  });

  const verifyOtp = generateOtp();
  await redis.setex(`phone-verify:${userId}`, PHONE_VERIFY_OTP_TTL, sha256(verifyOtp));
  // SMS is currently a no-op stub; logs OTP for dev.
  notificationService.sendSmsOtp(dto.new_phone_number, verifyOtp, 'change_phone');

  return new ServiceSuccess(
    { phone_number: dto.new_phone_number, phone_verified: false },
    PROFILE_MESSAGES.PHONE_CHANGE_INITIATED,
  );
};

export const verifyPhone = async (dto: VerifyOtpOnlyDto, userId: string) => {
  const key = `phone-verify:${userId}`;
  const storedHash = await redis.get(key);
  if (!storedHash) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }
  const providedHash = sha256(dto.otp);
  if (
    storedHash.length !== providedHash.length ||
    !crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash))
  ) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }

  await repo.updateUserFields(userId, { phone_verified_at: new Date() });
  await redis.del(key);

  return new ServiceSuccess(null, PROFILE_MESSAGES.PHONE_VERIFIED);
};

// ── DELETE /me ───────────────────────────────────────────────────────────────

export const deleteAccount = async (dto: DeleteAccountDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.ACCOUNT_DELETED, 401);
  }
  if (!dto.confirm) {
    return new ServiceError('confirmation_required', PROFILE_MESSAGES.ACCOUNT_DELETED, 400);
  }

  const otpOk = await consumeSensitiveOtp(userId, 'delete_account', dto.otp);
  if (!otpOk) {
    return new ServiceError('invalid_otp', PROFILE_MESSAGES.OTP_INVALID, 401);
  }

  // Anonymize email/phone so the unique constraints free up for reuse.
  // Anonymized phone must remain E.164-compliant (`+` then 1-15 digits, first
  // digit non-zero). Format: `+1000` + 11 random digits → 15 digits total.
  const tag = newRawId();
  const anonEmail = `deleted+${tag}@ohlify.invalid`;
  const randomDigits = String(crypto.randomInt(10_000_000_000, 100_000_000_000));
  const anonPhone = `+1000${randomDigits}`;
  await repo.softDeleteUser(userId, anonEmail, anonPhone);
  await repo.revokeAllUserSessions(userId);

  // 30-day recovery window: hard purge cron (worker) removes after this date.
  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return new ServiceSuccess(
    { deletion_scheduled_for: scheduledFor.toISOString() },
    PROFILE_MESSAGES.ACCOUNT_DELETED,
  );
};

// ── Notification preferences ─────────────────────────────────────────────────

export const getPreferences = async (userId: string) => {
  const row = await repo.ensureNotificationPreferences(userId);
  return new ServiceSuccess(toPrefsView(row), PROFILE_MESSAGES.PREFERENCES_FETCHED);
};

export const patchPreferences = async (dto: NotificationPreferencesPatchDto, userId: string) => {
  const row = await repo.updateNotificationPreferences(userId, dto);
  return new ServiceSuccess(toPrefsView(row), PROFILE_MESSAGES.PREFERENCES_UPDATED);
};

// ── Bank account ─────────────────────────────────────────────────────────────

export const getBankAccount = async (userId: string) => {
  const row = await repo.findBankAccount(userId);
  if (!row) {
    return new ServiceSuccess(null, PROFILE_MESSAGES.BANK_ACCOUNT_FETCHED);
  }
  return new ServiceSuccess(toBankView(row), PROFILE_MESSAGES.BANK_ACCOUNT_FETCHED);
};

export const putBankAccount = async (dto: PutBankAccountDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED, 401);
  }

  const bank = await repo.findBankByCode(dto.bank_code);
  if (!bank) {
    return new ServiceError('bank_not_found', PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED, 422);
  }

  if (!user.full_name || user.full_name.trim().length === 0) {
    return new ServiceError('kyc_incomplete', PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED, 422);
  }

  // Resolve account name via Paystack. Reuses the same Redis-cached resolve
  // helper as GET /banks/resolve so a typical mobile flow (resolve-on-type →
  // PUT-on-submit within 60s) only hits Paystack once. Surfaces upstream
  // failures as 502 so the user retries instead of silently storing stale data.
  let resolvedName: string;
  try {
    const resolved = await resolveBankAccountCached(dto.account_number, dto.bank_code);
    resolvedName = resolved.accountName;
  } catch (err) {
    if (err instanceof PaystackUnresolvableError) {
      return new ServiceError('unresolvable_account', PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED, 422);
    }
    if (err instanceof PaystackUpstreamError) {
      return new ServiceError(
        'upstream_unavailable',
        PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED,
        502,
        undefined,
        5,
      );
    }
    throw err;
  }

  // Fuzzy name-match: accept anything ≥ platformConfig.bankAccount().min_name_match_percent.
  const { min_name_match_percent } = platformConfig.bankAccount();
  const matchPercent = nameSimilarityPercent(user.full_name, resolvedName);
  if (matchPercent < min_name_match_percent) {
    logger.info(
      { userId, matchPercent, threshold: min_name_match_percent },
      'bank account name mismatch',
    );
    return new ServiceError('account_name_mismatch', PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED, 422, {
      account_name: [
        `Resolved bank account name does not match your profile name closely enough (matched ${matchPercent}%, need ≥${min_name_match_percent}%).`,
      ],
    });
  }

  const row = await repo.upsertBankAccount({
    userId,
    accountNumber: dto.account_number,
    bankCode: dto.bank_code,
    bankName: bank.name,
    accountName: resolvedName,
  });

  logger.info({ userId, bankCode: dto.bank_code, matchPercent }, 'bank account upserted');

  // Bust per-pro caches: bank_account presence is a KYC item, and adding it may
  // unblock a future kyc_status approval; even if the status doesn't flip yet,
  // /home and /professionals/:id should reflect the freshest state.
  if (user.role === 'professional') {
    await invalidateProfessionalCaches(userId);
  }

  return new ServiceSuccess(toBankView(row), PROFILE_MESSAGES.BANK_ACCOUNT_UPDATED);
};

export const deleteBankAccount = async (userId: string) => {
  await repo.deleteBankAccount(userId);
  // Re-evaluate KYC: bank_account is a required item for pros. If they were
  // already approved, this demotes them back to pending_review (which itself
  // busts the per-pro caches via invalidateProfessionalCaches inside the
  // demotion path).
  await onboardingService.revaluateKycStatus(userId);
  // Always bust on delete: even when the user wasn't approved, /home and
  // /professionals/:id may have surfaced base_price/etc that referenced the
  // bank state. Cheap and avoids stale views.
  await invalidateProfessionalCaches(userId);
  return new ServiceSuccess(null, PROFILE_MESSAGES.BANK_ACCOUNT_REMOVED);
};

// ── Avatar (file_key from uploads microservice) ──────────────────────────────

export const setAvatar = async (dto: PostAvatarDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user || user.deleted_at !== null) {
    return new ServiceError('token_invalid', PROFILE_MESSAGES.AVATAR_UPDATED, 401);
  }
  await repo.updateUserFields(userId, { avatar_url: dto.file_key });
  if (user.role === 'professional') {
    await invalidateProfessionalCaches(userId);
  }
  return new ServiceSuccess({ avatar_url: dto.file_key }, PROFILE_MESSAGES.AVATAR_UPDATED);
};

export const removeAvatar = async (userId: string) => {
  const user = await repo.findUserById(userId);
  await repo.updateUserFields(userId, { avatar_url: null });
  if (user?.role === 'professional') {
    await invalidateProfessionalCaches(userId);
  }
  return new ServiceSuccess(null, PROFILE_MESSAGES.AVATAR_REMOVED);
};

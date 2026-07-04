import * as onboardingService from '@features/onboarding/onboarding.service.js';
import { invalidateProfessionalCaches } from '@features/professionals/professionals.cache.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { RATES_MESSAGES } from './rates.messages.js';
import * as repo from './rates.repo.js';
import type { CreateRateDto, UpdateRateDto } from './rates.schema.js';
import { perMinuteKobo, type CallType, type RateRow, type RateView } from './rates.types.js';

const toView = (row: RateRow): RateView => ({
  id: row.id,
  call_type: row.call_type,
  duration_minutes: row.duration_minutes,
  price_kobo: Number(row.price_kobo),
  price_per_minute_kobo: perMinuteKobo(Number(row.price_kobo), row.duration_minutes),
  currency: row.currency,
});

const validateCallType = (callType: CallType): ServiceError | null => {
  const { allowed_call_types } = platformConfig.rate();
  if (!allowed_call_types.includes(callType)) {
    return new ServiceError('value_out_of_range', RATES_MESSAGES.INVALID_DURATION, 422, {
      call_type: [`call_type must be one of: ${allowed_call_types.join(', ')}`],
    });
  }
  return null;
};

const validateDuration = (durationMinutes: number): ServiceError | null => {
  const { allowed_durations_minutes } = platformConfig.rate();
  if (!allowed_durations_minutes.includes(durationMinutes)) {
    return new ServiceError('value_out_of_range', RATES_MESSAGES.INVALID_DURATION, 422, {
      duration_minutes: [
        `duration_minutes must be one of: ${allowed_durations_minutes.join(', ')}`,
      ],
    });
  }
  return null;
};

const validatePrice = (priceKobo: number): ServiceError | null => {
  const { min_kobo, max_kobo } = platformConfig.rate();
  if (priceKobo < min_kobo || priceKobo > max_kobo) {
    return new ServiceError('value_out_of_range', RATES_MESSAGES.INVALID_PRICE, 422, {
      price_kobo: [`price_kobo must be between ${min_kobo} and ${max_kobo}`],
    });
  }
  return null;
};

export const listMine = async (userId: string) => {
  const rows = await repo.findActiveByUser(userId);
  return new ServiceSuccess(rows.map(toView), RATES_MESSAGES.LIST_FETCHED);
};

// Validates whichever of call_type / duration / price are present. Used by the
// partial-update path (create validates all three directly).
const validateRateFields = (dto: UpdateRateDto): ServiceError | null => {
  if (dto.call_type !== undefined) {
    const err = validateCallType(dto.call_type);
    if (err !== null) return err;
  }
  if (dto.duration_minutes !== undefined) {
    const err = validateDuration(dto.duration_minutes);
    if (err !== null) return err;
  }
  if (dto.price_kobo !== undefined) {
    const err = validatePrice(dto.price_kobo);
    if (err !== null) return err;
  }
  return null;
};

// Enforces the active-rate uniqueness rule for the current pricing model:
// one-per-(pro, call_type) when single_rate_per_channel is on, else
// one-per-(pro, call_type, duration). `excludeRateId` skips the row being
// edited so an update doesn't collide with itself. Returns null when clear.
const checkRateCollision = async (
  userId: string,
  callType: CallType,
  durationMinutes: number,
  excludeRateId?: string,
): Promise<ServiceError | null> => {
  if (platformConfig.rate().single_rate_per_channel) {
    const existing = await repo.findActiveByUserAndCallType(userId, callType);
    if (existing !== null && existing.id !== excludeRateId) {
      return new ServiceError('conflict', RATES_MESSAGES.CHANNEL_RATE_EXISTS, 409);
    }
    return null;
  }
  const dup = await repo.findActiveByUserAndShape(userId, callType, durationMinutes);
  if (dup !== null && dup.id !== excludeRateId) {
    return new ServiceError('conflict', RATES_MESSAGES.DUPLICATE, 409);
  }
  return null;
};

export const create = async (dto: CreateRateDto, userId: string) => {
  const callTypeErr = validateCallType(dto.call_type);
  if (callTypeErr !== null) return callTypeErr;
  const durationErr = validateDuration(dto.duration_minutes);
  if (durationErr !== null) return durationErr;
  const priceErr = validatePrice(dto.price_kobo);
  if (priceErr !== null) return priceErr;

  const collision = await checkRateCollision(userId, dto.call_type, dto.duration_minutes);
  if (collision !== null) return collision;

  const row = await repo.create({
    userId,
    callType: dto.call_type,
    durationMinutes: dto.duration_minutes,
    priceKobo: dto.price_kobo,
  });
  await invalidateProfessionalCaches(userId);
  return new ServiceSuccess(toView(row), RATES_MESSAGES.CREATED);
};

export const update = async (rateId: string, dto: UpdateRateDto, userId: string) => {
  const existing = await repo.findByIdForUser(rateId, userId);
  if (!existing) {
    return new ServiceError('not_found', RATES_MESSAGES.NOT_FOUND, 404);
  }

  const fieldErr = validateRateFields(dto);
  if (fieldErr !== null) return fieldErr;

  // Ensure the edit doesn't collide with another active rate. Only re-check
  // when the shape actually changed (call_type or duration).
  const newCallType = dto.call_type ?? existing.call_type;
  const newDuration = dto.duration_minutes ?? existing.duration_minutes;
  if (newCallType !== existing.call_type || newDuration !== existing.duration_minutes) {
    const collision = await checkRateCollision(userId, newCallType, newDuration, rateId);
    if (collision !== null) return collision;
  }

  const updated = await repo.update(rateId, userId, {
    ...(dto.call_type !== undefined ? { callType: dto.call_type } : {}),
    ...(dto.duration_minutes !== undefined ? { durationMinutes: dto.duration_minutes } : {}),
    ...(dto.price_kobo !== undefined ? { priceKobo: dto.price_kobo } : {}),
  });
  if (!updated) {
    return new ServiceError('not_found', RATES_MESSAGES.NOT_FOUND, 404);
  }
  await invalidateProfessionalCaches(userId);
  return new ServiceSuccess(toView(updated), RATES_MESSAGES.UPDATED);
};

export const remove = async (rateId: string, userId: string) => {
  const ok = await repo.softDelete(rateId, userId);
  if (!ok) {
    return new ServiceError('not_found', RATES_MESSAGES.NOT_FOUND, 404);
  }
  // Re-evaluate KYC: rates is a required item for pros. If this was the last
  // active rate and they were approved, demote them back to pending_review.
  await onboardingService.revaluateKycStatus(userId);
  await invalidateProfessionalCaches(userId);
  return new ServiceSuccess(null, RATES_MESSAGES.DELETED);
};

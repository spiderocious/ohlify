import * as onboardingService from '@features/onboarding/onboarding.service.js';
import { invalidateProfessionalCaches } from '@features/professionals/professionals.cache.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { RATES_MESSAGES } from './rates.messages.js';
import * as repo from './rates.repo.js';
import type { CreateRateDto, UpdateRateDto } from './rates.schema.js';
import type { CallType, RateRow, RateView } from './rates.types.js';

const toView = (row: RateRow): RateView => ({
  id: row.id,
  call_type: row.call_type,
  duration_minutes: row.duration_minutes,
  price_kobo: Number(row.price_kobo),
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

export const create = async (dto: CreateRateDto, userId: string) => {
  const callTypeErr = validateCallType(dto.call_type);
  if (callTypeErr !== null) return callTypeErr;
  const durationErr = validateDuration(dto.duration_minutes);
  if (durationErr !== null) return durationErr;
  const priceErr = validatePrice(dto.price_kobo);
  if (priceErr !== null) return priceErr;

  const dup = await repo.findActiveByUserAndShape(userId, dto.call_type, dto.duration_minutes);
  if (dup !== null) {
    return new ServiceError('conflict', RATES_MESSAGES.DUPLICATE, 409);
  }

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

  if (dto.call_type !== undefined) {
    const callTypeErr = validateCallType(dto.call_type);
    if (callTypeErr !== null) return callTypeErr;
  }
  if (dto.duration_minutes !== undefined) {
    const durationErr = validateDuration(dto.duration_minutes);
    if (durationErr !== null) return durationErr;
  }
  if (dto.price_kobo !== undefined) {
    const priceErr = validatePrice(dto.price_kobo);
    if (priceErr !== null) return priceErr;
  }

  // If shape (call_type or duration) changed, ensure no duplicate.
  const newCallType = dto.call_type ?? existing.call_type;
  const newDuration = dto.duration_minutes ?? existing.duration_minutes;
  if (newCallType !== existing.call_type || newDuration !== existing.duration_minutes) {
    const dup = await repo.findActiveByUserAndShape(userId, newCallType, newDuration);
    if (dup !== null && dup.id !== rateId) {
      return new ServiceError('conflict', RATES_MESSAGES.DUPLICATE, 409);
    }
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

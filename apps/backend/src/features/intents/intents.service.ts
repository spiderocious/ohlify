import * as authRepo from '@features/auth/auth.repo.js';
import { withTransaction } from '@lib/db/tx.js';
import { nowUtc } from '@lib/time.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { evaluateCondition, type ConditionState } from './intents.evaluator.js';
import { INTENT_MESSAGES } from './intents.messages.js';
import * as repo from './intents.repo.js';
import type { CreateIntentDto } from './intents.schema.js';
import {
  INTENT_TTL_MINUTES,
  IntentNeed,
  IntentStatus,
  TERMINAL_INTENT_STATUSES,
  type IntentView,
  type PurchaseIntentRow,
} from './intents.types.js';

const toView = (row: PurchaseIntentRow, state: ConditionState): IntentView => ({
  ref: row.id,
  status: row.status,
  requirement: row.requirement,
  current_value: state.currentValue,
  shortfall: state.shortfall,
  expires_at: row.expires_at.toISOString(),
  created_at: row.created_at.toISOString(),
});

/**
 * Opens an intent for a condition the caller needs met.
 *
 * The condition is measured immediately so a caller who already qualifies gets
 * a satisfied ref back without being walked through a purchase they do not
 * need — the common case when a guard fires on stale client-side state.
 */
export const createIntent = async (dto: CreateIntentDto, userId: string) => {
  if (dto.need === IntentNeed.MINUTES) {
    const pro = await authRepo.findUserById(dto.professional_id);
    if (!pro || pro.role !== 'professional' || pro.deleted_at !== null) {
      return new ServiceError('not_found', INTENT_MESSAGES.PRO_NOT_FOUND, 404);
    }
  }

  const row = await repo.create({
    userId,
    need: dto.need,
    requirement: dto,
    ttlMinutes: INTENT_TTL_MINUTES,
  });

  const state = await evaluateCondition(userId, dto);
  if (!state.satisfied) {
    return new ServiceSuccess(toView(row, state), INTENT_MESSAGES.CREATED);
  }

  const satisfied = await withTransaction((client) =>
    repo.markStatus(client, row.id, IntentStatus.SATISFIED),
  );
  return new ServiceSuccess(toView(satisfied ?? row, state), INTENT_MESSAGES.CREATED);
};

const loadOwned = async (
  intentRef: string,
  userId: string,
): Promise<PurchaseIntentRow | ServiceError> => {
  const row = await repo.findById(intentRef);
  // A ref belonging to someone else is reported as missing rather than
  // forbidden — otherwise the 403 confirms the ref exists.
  if (!row || row.user_id !== userId) {
    return new ServiceError('not_found', INTENT_MESSAGES.NOT_FOUND, 404);
  }
  return row;
};

export const getIntent = async (intentRef: string, userId: string) => {
  const row = await loadOwned(intentRef, userId);
  if (row instanceof ServiceError) return row;
  const state = await evaluateCondition(userId, row.requirement);
  return new ServiceSuccess(toView(row, state), INTENT_MESSAGES.FETCHED);
};

/**
 * Re-measures the condition and settles the intent if it now holds.
 *
 * This is what the blocked caller waits on. It deliberately re-reads live
 * balances rather than trusting anything the client says happened, so a flow
 * that was abandoned, failed, or fabricated leaves the intent pending and the
 * caller's guard intact.
 *
 * An intent that lapsed while the user was mid-purchase still settles: the
 * money moved, so refusing on a timing technicality would strand it.
 */
export const verifyIntent = async (intentRef: string, userId: string) => {
  const existing = await loadOwned(intentRef, userId);
  if (existing instanceof ServiceError) return existing;

  const state = await evaluateCondition(userId, existing.requirement);

  if (existing.status === IntentStatus.SATISFIED) {
    return new ServiceSuccess(toView(existing, state), INTENT_MESSAGES.VERIFIED);
  }
  if (TERMINAL_INTENT_STATUSES.includes(existing.status)) {
    return new ServiceError('conflict', INTENT_MESSAGES.NOT_ACTIONABLE, 409);
  }
  if (!state.satisfied) {
    return new ServiceSuccess(toView(existing, state), INTENT_MESSAGES.VERIFIED);
  }

  const updated = await withTransaction((client) =>
    repo.markStatus(client, intentRef, IntentStatus.SATISFIED),
  );
  return new ServiceSuccess(toView(updated ?? existing, state), INTENT_MESSAGES.VERIFIED);
};

export const cancelIntent = async (intentRef: string, userId: string) => {
  const existing = await loadOwned(intentRef, userId);
  if (existing instanceof ServiceError) return existing;

  const state = await evaluateCondition(userId, existing.requirement);
  if (TERMINAL_INTENT_STATUSES.includes(existing.status)) {
    return new ServiceSuccess(toView(existing, state), INTENT_MESSAGES.CANCELLED);
  }

  const updated = await withTransaction((client) =>
    repo.markStatus(client, intentRef, IntentStatus.CANCELLED),
  );
  return new ServiceSuccess(toView(updated ?? existing, state), INTENT_MESSAGES.CANCELLED);
};

/** Retires intents whose window closed. Driven by the intents worker tick. */
export const expireStaleIntents = async (limit: number): Promise<number> => repo.expireStale(limit);

/** Exposed for the expiry sweep's logging; keeps `nowUtc` the single clock source. */
export const isExpired = (row: PurchaseIntentRow): boolean =>
  row.expires_at.getTime() < nowUtc().getTime();

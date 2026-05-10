import crypto from 'node:crypto';

import type { UserRow } from '@features/auth/auth.types.js';
import { invalidateProfessionalCaches } from '@features/professionals/professionals.cache.js';
import { redis } from '@lib/redis/client.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { HANDLE_REGEX, RESERVED_HANDLES } from '@shared/constants/reserved-handles.js';

import { buildKycSpec, findIncompleteKeys } from './onboarding.kyc-spec.js';
import { ONBOARDING_MESSAGES } from './onboarding.messages.js';
import * as repo from './onboarding.repo.js';
import type {
  ChangeHandleDto,
  ClientKycPatchDto,
  HandleCheckDto,
  ProfessionalKycPatchDto,
  SetRoleDto,
} from './onboarding.schema.js';
import type {
  KycProgress,
  KycStatus,
  OnboardingStatus,
  OnboardingStep,
} from './onboarding.types.js';

const HANDLE_CHECK_CACHE_TTL = 60;
const HANDLE_CHANGE_COOLDOWN_DAYS = 30;
const HANDLE_REDIRECT_DAYS = 90;

// MVP: read once at module load. Move to platform_config reader when feature flags ship.
const KYC_AUTO_APPROVE = true;

// ── Status / progress helpers ────────────────────────────────────────────────
//
// Progress is sourced from the same KYC-spec composer that powers
// GET /onboarding/kyc/spec, so /status, the PATCH responses, and the spec
// endpoint can never disagree.

const buildProgressFromSpec = async (user: UserRow): Promise<KycProgress> => {
  const spec = await buildKycSpec(user);
  const required = spec.items.filter((i) => i.required);
  const completed = required.filter((i) => i.complete).map((i) => i.key as string);
  return {
    completed_items: completed,
    total_items: required.length,
    percent: required.length === 0 ? 0 : Math.round((completed.length / required.length) * 100),
  };
};

const stepFor = (user: UserRow, completed: readonly string[], total: number): OnboardingStep => {
  // Rejection is a hard short-circuit: regardless of whether items are
  // still filled in (we don't clear them), the user has to view the
  // rejection reason and resubmit. The kyc_rejected step persists until
  // admin re-reviews — see policy doc above OnboardingStep.
  if (user.kyc_status === 'rejected') return 'kyc_rejected';

  // Derive step from items, NOT just from kyc_status. The status can be
  // `approved` while items are incomplete in narrow windows (e.g. a delete
  // request between revaluateKycStatus running and a later GET). Trust items.
  const allItemsComplete = total > 0 && completed.length === total;
  if (user.kyc_status === 'approved' && allItemsComplete) return 'complete';
  if (user.role === 'professional') {
    return allItemsComplete ? 'complete' : 'professional_kyc';
  }
  // role = client (default until role explicitly chosen)
  return allItemsComplete ? 'complete' : 'client_kyc';
};

// ── GET /onboarding/status ───────────────────────────────────────────────────

export const getStatus = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.STATUS_FETCHED, 401);
  }

  const progress = await buildProgressFromSpec(user);
  let step = stepFor(user, progress.completed_items, progress.total_items);

  // Role is technically always set in DB (defaults to 'client'), but step uses
  // role_selection until the user has confirmed via POST /onboarding/role.
  // We track this via kyc_status: kyc_status === 'none' AND no progress = role_selection.
  if (user.kyc_status === 'none' && progress.completed_items.length === 0 && !user.full_name) {
    step = 'role_selection';
  }

  // When step is kyc_rejected, attach the latest rejection details so the
  // rejection screen can render reason + admin note without an extra
  // round-trip. Source of truth is the most recent kyc_submissions row —
  // users.kyc_reject_reason carries the code only.
  //
  // `latest_submission_status` lets the client tell apart "user hasn't
  // resubmitted" (latest 'rejected') from "user already resubmitted,
  // awaiting re-review" (latest 'pending_review'). users.kyc_status stays
  // 'rejected' until admin acts again, per the documented policy.
  let rejection: OnboardingStatus['kyc_rejection'] = null;
  if (step === 'kyc_rejected') {
    const latest = await repo.findLatestKycSubmission(userId);
    if (latest) {
      rejection = {
        reason_code: latest.reject_reason_code ?? user.kyc_reject_reason ?? 'unknown',
        note: latest.reject_note,
        reviewed_at: latest.reviewed_at?.toISOString() ?? null,
        submission_id: latest.id,
        latest_submission_status: latest.status,
      };
    }
  }

  const status: OnboardingStatus = {
    step,
    role: user.role,
    kyc_progress: progress,
    kyc_rejection: rejection,
  };

  return new ServiceSuccess(status, ONBOARDING_MESSAGES.STATUS_FETCHED);
};

// ── POST /onboarding/role ────────────────────────────────────────────────────

export const setRole = async (dto: SetRoleDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.ROLE_SET, 401);
  }

  // Role is "set" once kyc_status leaves 'none' OR full_name is populated. Until
  // then, the default 'client' is provisional and switchable.
  const roleAlreadyConfirmed = user.kyc_status !== 'none' || user.full_name !== null;
  if (roleAlreadyConfirmed && user.role !== dto.role) {
    return new ServiceError('role_already_set', ONBOARDING_MESSAGES.ROLE_SET, 409);
  }

  if (user.role !== dto.role) {
    await repo.setUserRole(userId, dto.role);
  }

  const nextStep: OnboardingStep = dto.role === 'professional' ? 'professional_kyc' : 'client_kyc';

  return new ServiceSuccess({ role: dto.role, next_step: nextStep }, ONBOARDING_MESSAGES.ROLE_SET);
};

// ── PATCH /onboarding/kyc/client ─────────────────────────────────────────────

export const patchClientKyc = async (dto: ClientKycPatchDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 401);
  }
  if (user.role !== 'client') {
    return new ServiceError('role_mismatch', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 403);
  }

  const updates: Record<string, unknown> = {};
  if (dto.full_name !== undefined) updates['full_name'] = dto.full_name;
  if (dto.description !== undefined) updates['description'] = dto.description;
  if (dto.interests !== undefined) updates['interests'] = dto.interests;

  const updated = (await repo.updateUserFields(userId, updates)) ?? user;
  const progress = await buildProgressFromSpec(updated);

  return new ServiceSuccess({ kyc_progress: progress }, ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED);
};

// ── PATCH /onboarding/kyc/professional ───────────────────────────────────────

const validateHandleForUpdate = async (
  newHandle: string,
  currentHandle: string | null,
): Promise<ServiceError | null> => {
  if (newHandle === currentHandle) return null;
  if (!HANDLE_REGEX.test(newHandle)) {
    return new ServiceError('handle_invalid_format', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 400);
  }
  if (RESERVED_HANDLES.has(newHandle)) {
    return new ServiceError('handle_reserved', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 400);
  }
  const taken = await repo.isHandleTaken(newHandle);
  if (taken) {
    return new ServiceError('handle_taken', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 409);
  }
  return null;
};

const buildProUpdatesFromDto = (
  dto: ProfessionalKycPatchDto,
  currentHandle: string | null,
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  if (dto.full_name !== undefined) updates['full_name'] = dto.full_name;
  if (dto.handle !== undefined) {
    updates['handle'] = dto.handle;
    // Stamp handle_changed_at whenever the handle actually changes (including
    // first-time assignment from null). This closes the cooldown loophole where
    // a user could set a handle here and then immediately rename via /me/handle.
    if (dto.handle !== currentHandle) {
      updates['handle_changed_at'] = new Date();
    }
  }
  if (dto.occupation !== undefined) updates['occupation'] = dto.occupation;
  if (dto.description !== undefined) updates['description'] = dto.description;
  if (dto.interests !== undefined) updates['interests'] = dto.interests;
  return updates;
};

export const patchProfessionalKyc = async (dto: ProfessionalKycPatchDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 401);
  }
  if (user.role !== 'professional') {
    return new ServiceError('role_mismatch', ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED, 403);
  }

  if (dto.handle !== undefined) {
    const handleErr = await validateHandleForUpdate(dto.handle, user.handle);
    if (handleErr !== null) return handleErr;
  }

  const updates = buildProUpdatesFromDto(dto, user.handle);
  const updated = (await repo.updateUserFields(userId, updates)) ?? user;

  // Identity: persist a kyc_submission row if provided. Prefer the new
  // `document_upload_key` field; fall back to the legacy `document_upload_id`
  // for old slice clients (both store into the same column).
  if (dto.identity !== undefined) {
    const docKey = dto.identity.document_upload_key ?? dto.identity.document_upload_id;
    await repo.upsertKycSubmission({
      userId,
      identityType: dto.identity.type,
      identityNumber: dto.identity.number,
      documentUploadId: docKey,
      status: 'pending_review',
    });
  }

  // Selfie can be submitted independently of identity. If there's already a
  // submission, patch it; otherwise create a stub so the value is captured.
  // (We don't reject "selfie without identity" — admins decide.)
  if (dto.selfie !== undefined) {
    const updated = await repo.updateLatestSelfieKey(userId, dto.selfie.upload_key);
    if (!updated) {
      // No existing submission — selfie alone isn't enough to materialize one
      // because identity_type/number are NOT NULL. Surface a clean error so
      // the frontend prompts the user to fill identity first.
      return new ServiceError(
        'identity_required_first',
        ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED,
        422,
        { selfie: ['Submit identity verification before adding a selfie.'] },
      );
    }
    // Bootstrap the public-facing avatar from the selfie when the user
    // hasn't picked one explicitly. POST /me/avatar always takes precedence
    // over this — the helper is a no-op when avatar_url is already set.
    await repo.setAvatarFromSelfieIfNull(userId, dto.selfie.upload_key);
  }

  // Any of these fields (full_name, handle, occupation, description, interests)
  // is surfaced by /professionals/:id, so bust the per-pro caches.
  await invalidateProfessionalCaches(userId);

  const progress = await buildProgressFromSpec(updated);

  return new ServiceSuccess({ kyc_progress: progress }, ONBOARDING_MESSAGES.KYC_PROGRESS_UPDATED);
};

// ── GET /onboarding/handle/check ─────────────────────────────────────────────

const generateHandleSuggestions = (base: string): string[] => {
  const stripped = base.replace(/[^a-z0-9]/g, '').slice(0, 18) || 'user';
  const random = crypto.randomInt(10, 99);
  return [
    `${stripped}_${random}`,
    `${stripped}${random}`,
    `${stripped}_${crypto.randomInt(100, 999)}`,
  ].map((s) => s.slice(0, 24));
};

export const checkHandle = async (dto: HandleCheckDto) => {
  const handle = dto.handle;

  if (!HANDLE_REGEX.test(handle)) {
    return new ServiceSuccess(
      {
        available: false,
        reason: 'invalid_format' as const,
        suggestions: generateHandleSuggestions(handle),
      },
      ONBOARDING_MESSAGES.HANDLE_CHECKED,
    );
  }

  if (RESERVED_HANDLES.has(handle)) {
    return new ServiceSuccess(
      {
        available: false,
        reason: 'reserved' as const,
        suggestions: generateHandleSuggestions(handle),
      },
      ONBOARDING_MESSAGES.HANDLE_CHECKED,
    );
  }

  // Cache positive answers briefly to absorb keystroke debounce.
  const cacheKey = `handle:check:${handle}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    if (cached === 'available') {
      return new ServiceSuccess(
        { available: true, normalized: handle },
        ONBOARDING_MESSAGES.HANDLE_CHECKED,
      );
    }
  }

  const taken = await repo.isHandleTaken(handle);
  if (taken) {
    await redis.setex(cacheKey, HANDLE_CHECK_CACHE_TTL, 'taken');
    return new ServiceSuccess(
      {
        available: false,
        reason: 'taken' as const,
        suggestions: generateHandleSuggestions(handle),
      },
      ONBOARDING_MESSAGES.HANDLE_CHECKED,
    );
  }

  await redis.setex(cacheKey, HANDLE_CHECK_CACHE_TTL, 'available');
  return new ServiceSuccess(
    { available: true, normalized: handle },
    ONBOARDING_MESSAGES.HANDLE_CHECKED,
  );
};

// ── POST /me/handle ──────────────────────────────────────────────────────────

export const changeHandle = async (dto: ChangeHandleDto, userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.HANDLE_CHANGED, 401);
  }
  if (user.role !== 'professional') {
    return new ServiceError('role_mismatch', ONBOARDING_MESSAGES.HANDLE_CHANGED, 403);
  }

  if (!HANDLE_REGEX.test(dto.handle)) {
    return new ServiceError('handle_invalid_format', ONBOARDING_MESSAGES.HANDLE_CHANGED, 400);
  }
  if (RESERVED_HANDLES.has(dto.handle)) {
    return new ServiceError('handle_reserved', ONBOARDING_MESSAGES.HANDLE_CHANGED, 400);
  }

  // Cooldown enforcement (30 days).
  const handleChangedAt = user.handle_changed_at;
  if (handleChangedAt !== null) {
    const cooldownExpiresAt =
      handleChangedAt.getTime() + HANDLE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now < cooldownExpiresAt) {
      const retryAfter = Math.ceil((cooldownExpiresAt - now) / 1000);
      return new ServiceError(
        'handle_cooldown',
        ONBOARDING_MESSAGES.HANDLE_CHANGED,
        429,
        undefined,
        retryAfter,
      );
    }
  }

  if (user.handle === dto.handle) {
    // No-op rename — return current state without touching cooldown.
    const expiresAt = new Date(Date.now() + HANDLE_REDIRECT_DAYS * 24 * 60 * 60 * 1000);
    return new ServiceSuccess(
      {
        handle: dto.handle,
        share_url: `https://ohlify.com/${dto.handle}`,
        previous_handle_redirects_until: expiresAt.toISOString(),
      },
      ONBOARDING_MESSAGES.HANDLE_CHANGED,
    );
  }

  const taken = await repo.isHandleTaken(dto.handle);
  if (taken) {
    return new ServiceError('handle_taken', ONBOARDING_MESSAGES.HANDLE_CHANGED, 409);
  }

  const oldHandle = user.handle;
  const expiresAt = new Date(Date.now() + HANDLE_REDIRECT_DAYS * 24 * 60 * 60 * 1000);

  await repo.updateUserFields(userId, {
    handle: dto.handle,
    handle_changed_at: new Date(),
  });

  if (oldHandle !== null && oldHandle !== '') {
    await repo.insertHandleRedirect(oldHandle, userId, expiresAt);
  }

  // share_slug derives from handle in /professionals/:id; bust the cache.
  await invalidateProfessionalCaches(userId);

  return new ServiceSuccess(
    {
      handle: dto.handle,
      share_url: `https://ohlify.com/${dto.handle}`,
      previous_handle_redirects_until: expiresAt.toISOString(),
    },
    ONBOARDING_MESSAGES.HANDLE_CHANGED,
  );
};

// ── POST /onboarding/kyc/complete ────────────────────────────────────────────
//
// Completion is derived from `kyc.professional_items` / `kyc.client_items`
// platform_config rows via findIncompleteKeys (see onboarding.kyc-spec.ts).
// The legacy isProKycComplete / isClientKycComplete helpers are gone — they
// hardcoded the item list and missed admin-toggleable items like `selfie`.

// Re-evaluate a user's KYC status after a required item has potentially
// disappeared (e.g. last rate deleted, bank account deleted). If the user is
// currently `approved` but no longer has all required items, demote to
// `pending_review`. No-op when the user is already incomplete or remains
// complete. Safe to call from any feature service after a delete-style mutation.
export const revaluateKycStatus = async (userId: string): Promise<void> => {
  const user = await repo.findUserById(userId);
  if (!user || user.kyc_status !== 'approved') return;

  const incomplete = await findIncompleteKeys(user);
  if (incomplete.length === 0) return;

  await repo.setKycStatus(userId, 'pending_review', false, false);
  // Bust per-pro caches so a de-approved pro disappears from detail/rates/home
  // immediately rather than after the cache TTL.
  await invalidateProfessionalCaches(userId);
};

export const completeKyc = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.KYC_SUBMITTED, 401);
  }

  const incompleteKeys = await findIncompleteKeys(user);
  if (incompleteKeys.length > 0) {
    return new ServiceError('kyc_incomplete', ONBOARDING_MESSAGES.KYC_SUBMITTED, 422, {
      incomplete_items: incompleteKeys.map((k) => String(k)),
    });
  }

  const finalStatus: KycStatus = KYC_AUTO_APPROVE ? 'approved' : 'pending_review';
  // completeKycInTx writes BOTH the users row AND the latest
  // kyc_submissions row in a single transaction so they can never drift.
  // Previously we only set users.kyc_status — the submission row stayed
  // 'pending_review' (or 'rejected') indefinitely, which broke the
  // customer rejection screen and confused admin queues. See repo doc.
  await repo.completeKycInTx(userId, finalStatus);
  // Approval flips visibility; bust caches so the new pro shows up in
  // /home and /professionals/:id immediately.
  if (finalStatus === 'approved') {
    await invalidateProfessionalCaches(userId);
  }

  return new ServiceSuccess(
    { kyc_status: finalStatus, next_step: 'complete' as const },
    finalStatus === 'approved'
      ? ONBOARDING_MESSAGES.KYC_APPROVED
      : ONBOARDING_MESSAGES.KYC_SUBMITTED,
  );
};

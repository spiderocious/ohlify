import type { UserRole, UserRow } from '@features/auth/auth.types.js';
import * as profileRepo from '@features/profile/profile.repo.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { perMinuteKobo } from '@features/rates/rates.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { ONBOARDING_MESSAGES } from './onboarding.messages.js';
import * as repo from './onboarding.repo.js';
import { KNOWN_KYC_ITEM_KEYS } from './onboarding.types.js';
import type {
  KycItemConfig,
  KycItemKey,
  KycItemSpec,
  KycItemStatus,
  KycResubmission,
  KycSpecResponse,
  KycSubmissionRow,
  OnboardingStep,
} from './onboarding.types.js';

const KNOWN_KEY_SET = new Set<string>(KNOWN_KYC_ITEM_KEYS);

/**
 * Same defensive read filter the status endpoint uses. Kept local so the
 * spec module doesn't reach across into onboarding.service for a helper.
 */
const sanitizeItemKeys = (raw: string[] | null | undefined): KycItemKey[] => {
  if (!raw || raw.length === 0) return [];
  const out: KycItemKey[] = [];
  const seen = new Set<string>();
  for (const k of raw) {
    if (!KNOWN_KEY_SET.has(k)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k as KycItemKey);
  }
  return out;
};

// ── Per-item value/complete builders ─────────────────────────────────────────

const maskAccountNumber = (raw: string): string => {
  if (raw.length <= 4) return raw;
  return `${'*'.repeat(raw.length - 4)}${raw.slice(-4)}`;
};

const maskIdNumber = (raw: string): string => {
  if (raw.length <= 4) return raw;
  return `${'*'.repeat(raw.length - 4)}${raw.slice(-4)}`;
};

const buildTextValue = (raw: string | null): { value: string | null; complete: boolean } => {
  const trimmed = raw && raw.trim().length > 0 ? raw : null;
  return { value: trimmed, complete: trimmed !== null };
};

const buildTagsValue = (raw: string[]): { value: string[] | null; complete: boolean } => {
  return { value: raw.length > 0 ? raw : null, complete: raw.length > 0 };
};

interface BankValue {
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_name: string;
}

interface IdentityValue {
  method: KycSubmissionRow['identity_type'];
  id_number_masked: string;
  document_upload_key: string | null;
}

interface SelfieValue {
  upload_key: string;
}

interface RateValue {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
}

/**
 * Value shape for the per-channel rate items (`audio_rate` / `video_rate`).
 * A single object or null — never a list — because at most one rate per
 * channel is active (`rates.single_rate_per_channel`).
 *
 * `price_per_minute_kobo` is the floored per-minute the professional is paid;
 * it ships here so the client renders the same number the server derives
 * rather than recomputing (and rounding) it independently.
 */
interface CallRateValue {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
  price_per_minute_kobo: number;
}

const buildCallRateValue = (
  rates: KycAggregates['rates'],
  callType: 'audio' | 'video',
): { value: CallRateValue | null; complete: boolean } => {
  // Newest wins. `findActiveByUser` can return more than one active row per
  // channel for data created before single_rate_per_channel was switched on,
  // so pick deterministically instead of trusting the query's ordering.
  const matches = rates
    .filter((r) => r.call_type === callType)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const row = matches[0];
  if (!row) return { value: null, complete: false };

  const priceKobo = Number(row.price_kobo);
  return {
    value: {
      id: row.id,
      call_type: row.call_type,
      duration_minutes: row.duration_minutes,
      price_kobo: priceKobo,
      // `perMinuteKobo` throws on a non-positive duration. The column is NOT
      // NULL and the write path validates `.positive()`, so this can only be
      // legacy data — but a service must never throw, so guard rather than bet.
      price_per_minute_kobo:
        row.duration_minutes > 0 ? perMinuteKobo(priceKobo, row.duration_minutes) : 0,
    },
    complete: true,
  };
};

// ── Aggregator: load everything we might need in one go ──────────────────────

interface KycAggregates {
  bank: Awaited<ReturnType<typeof profileRepo.findBankAccount>>;
  identity: KycSubmissionRow | null;
  rates: Awaited<ReturnType<typeof ratesRepo.findActiveByUser>>;
}

const loadAggregates = async (userId: string): Promise<KycAggregates> => {
  const [bank, identity, rates] = await Promise.all([
    profileRepo.findBankAccount(userId),
    repo.findLatestKycSubmission(userId),
    ratesRepo.findActiveByUser(userId),
  ]);
  return { bank, identity, rates };
};

// ── One spec entry per known kind ────────────────────────────────────────────

const buildItemSpec = (config: KycItemConfig, user: UserRow, agg: KycAggregates): KycItemSpec => {
  // `status`, `locked` and `lock_reason` are overwritten by `decorateItem`
  // once the whole set is known — an item's lifecycle depends on the
  // submission it belongs to, not on the item alone. These are placeholders
  // so every return path below stays a complete `KycItemSpec`.
  const base = {
    ...config,
    value: null as unknown,
    complete: false,
    status: 'not_started' as KycItemStatus,
    locked: false,
    lock_reason: null as string | null,
  };

  switch (config.key) {
    case 'full_name': {
      const { value, complete } = buildTextValue(user.full_name);
      return { ...base, value, complete };
    }
    case 'handle': {
      const { value, complete } = buildTextValue(user.handle);
      return { ...base, value, complete };
    }
    case 'occupation': {
      const { value, complete } = buildTextValue(user.occupation);
      return { ...base, value, complete };
    }
    case 'description': {
      const { value, complete } = buildTextValue(user.description);
      return { ...base, value, complete };
    }
    case 'interests': {
      const { value, complete } = buildTagsValue(user.interests ?? []);
      return { ...base, value, complete };
    }
    case 'bank_account': {
      if (!agg.bank) return base;
      const value: BankValue = {
        bank_code: agg.bank.bank_code,
        bank_name: agg.bank.bank_name,
        account_number_masked: maskAccountNumber(agg.bank.account_number),
        account_name: agg.bank.account_name,
      };
      return { ...base, value, complete: true };
    }
    case 'identity': {
      if (!agg.identity) return base;
      const value: IdentityValue = {
        method: agg.identity.identity_type,
        id_number_masked: maskIdNumber(agg.identity.identity_number),
        document_upload_key: agg.identity.document_upload_id,
      };
      // Identity is only "complete" when both number AND document photo exist.
      const complete = agg.identity.document_upload_id !== null;
      return { ...base, value, complete };
    }
    case 'selfie': {
      if (!agg.identity?.selfie_upload_key) return base;
      const value: SelfieValue = { upload_key: agg.identity.selfie_upload_key };
      return { ...base, value, complete: true };
    }
    case 'client_selfie': {
      // Reads `users`, not kyc_submissions — a client has no submission row to
      // read from, which is exactly why this key is separate from `selfie`.
      if (!user.selfie_upload_key) return base;
      const value: SelfieValue = { upload_key: user.selfie_upload_key };
      return { ...base, value, complete: true };
    }
    // Deprecated, kept live so an operator whose platform_config row still
    // holds the old single `rates` item keeps working until migration 0098
    // has run in their environment.
    case 'rates': {
      if (agg.rates.length === 0) return base;
      const value: RateValue[] = agg.rates.map((r) => ({
        id: r.id,
        call_type: r.call_type,
        duration_minutes: r.duration_minutes,
        price_kobo: Number(r.price_kobo),
      }));
      return { ...base, value, complete: true };
    }
    case 'audio_rate': {
      const { value, complete } = buildCallRateValue(agg.rates, 'audio');
      return { ...base, value, complete };
    }
    case 'video_rate': {
      const { value, complete } = buildCallRateValue(agg.rates, 'video');
      return { ...base, value, complete };
    }
    default:
      // Unknown key from a config row that ships ahead of code. Render as
      // disabled so the frontend hides it cleanly.
      return base;
  }
};

// ── Per-item lifecycle: status + locking ─────────────────────────────────────

/**
 * Copy for every reason an item can be locked. Inline strings would be a
 * message-key violation; these are UI copy for a per-item affordance rather
 * than a response message, but keeping them in one place still beats scattering
 * them through the switch.
 */
const LOCK_REASONS = {
  UNDER_REVIEW: 'Locked while we review your submission.',
  NOT_FLAGGED: 'This one was fine — no changes needed.',
} as const;

interface DecorateContext {
  /** The user's overall KYC status. */
  kycStatus: UserRow['kyc_status'];
  /**
   * The active partial-rejection set, or null when no partial rejection is in
   * force. Null covers both "nothing rejected" and "whole submission
   * rejected" — in the latter every item is editable, so there is nothing to
   * scope.
   */
  resubmitKeys: KycItemKey[] | null;
}

/**
 * Layers `status`, `locked` and `lock_reason` onto an item once the whole
 * submission's state is known.
 *
 * Separate from `buildItemSpec` on purpose: that function answers "what has
 * this user filled in", which depends only on the item. This one answers "what
 * may they do about it now", which depends on the submission around it. Folding
 * them together is how the client ended up recombining three fields itself.
 */
const decorateItem = (item: KycItemSpec, ctx: DecorateContext): KycItemSpec => {
  const flagged = ctx.resubmitKeys?.includes(item.key) ?? false;

  // A flagged item outranks everything: the user's whole job right now is to
  // fix it, and it stays editable even though the submission was rejected.
  if (flagged) {
    return { ...item, status: 'action_needed', locked: false, lock_reason: null };
  }

  // Partial rejection in force and this item was not flagged — it passed.
  // Locked so the user cannot quietly change something admin already accepted,
  // which is the same rule the PATCH handlers enforce server-side.
  if (ctx.resubmitKeys !== null) {
    return {
      ...item,
      status: item.complete ? 'verified' : 'not_started',
      locked: true,
      lock_reason: LOCK_REASONS.NOT_FLAGGED,
    };
  }

  // Awaiting review: everything freezes. Not an error — the user simply cannot
  // speed it up, so the tone is caution, never critical.
  if (ctx.kycStatus === 'pending_review') {
    return {
      ...item,
      status: 'under_review',
      locked: true,
      lock_reason: LOCK_REASONS.UNDER_REVIEW,
    };
  }

  // `approved` reports verified only for items actually filled in. An approved
  // user can still have an incomplete optional item, and calling that
  // "verified" would be a lie the badge repeats on every render.
  if (ctx.kycStatus === 'approved' && item.complete) {
    return { ...item, status: 'verified', locked: false, lock_reason: null };
  }

  return {
    ...item,
    status: item.complete ? 'verified' : 'not_started',
    locked: false,
    lock_reason: null,
  };
};

// ── Public: derive the list of required-and-incomplete keys ──────────────────

export const getKycItemsForRole = (role: UserRole): KycItemConfig[] => {
  const cfg = platformConfig.kyc();
  return role === 'professional' ? cfg.professional_items : cfg.client_items;
};

export const getRequiredKycKeysForRole = (role: UserRole): KycItemKey[] => {
  return getKycItemsForRole(role)
    .filter((i) => i.enabled && i.required)
    .map((i) => i.key);
};

/**
 * Snapshots the full KYC spec for a user — config + per-user values +
 * completeness flags — exactly what the frontend renders the screen from.
 *
 * When the user is currently in a `kyc_rejected` state with admin-flagged
 * items, the response also carries a `resubmission` block telling the
 * client which items to keep editable. We resolve that here (rather than
 * making the client fetch /onboarding/status separately) so a single
 * round-trip drives the screen.
 */
export const buildKycSpec = async (user: UserRow): Promise<KycSpecResponse> => {
  const items = getKycItemsForRole(user.role);
  const agg = await loadAggregates(user.id);
  const built = items.filter((i) => i.enabled).map((i) => buildItemSpec(i, user, agg));
  const requiredItems = built.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.complete);

  // Resubmission scoping: only relevant when the latest submission is
  // still in `rejected` (user hasn't resubmitted yet). Once the user has
  // PATCH'd anything, a new submission row is created with status
  // `pending_review`, and we drop the scoping — at that point they're
  // waiting for re-review and the rejected screen takes over the route.
  let resubmission: KycResubmission | null = null;
  if (user.kyc_status === 'rejected' && agg.identity?.status === 'rejected') {
    const itemKeys = sanitizeItemKeys(agg.identity.reject_item_keys);
    if (itemKeys.length > 0) {
      resubmission = {
        submission_id: agg.identity.id,
        item_keys: itemKeys,
        acknowledged_keys: sanitizeItemKeys(agg.identity.reject_acknowledged_keys),
        reason_code: agg.identity.reject_reason_code ?? 'unknown',
        note: agg.identity.reject_note,
      };
    }
  }

  // Decorate last: an item's status and lock depend on the resubmission block
  // resolved just above, so this cannot run inside the map that built them.
  //
  // Counts are taken from `built`, before decoration, deliberately —
  // `completed_count` means "filled in", and an item locked because admin
  // already accepted it is still filled in. Deriving the counts from the
  // decorated list would make the progress bar drop when a partial rejection
  // arrives, which is the opposite of what happened.
  const decorated = built.map((i) =>
    decorateItem(i, {
      kycStatus: user.kyc_status,
      resubmitKeys: resubmission?.item_keys ?? null,
    }),
  );

  return {
    role: user.role,
    items: decorated,
    completed_count: completedRequired.length,
    total_required: requiredItems.length,
    all_complete: requiredItems.length > 0 && completedRequired.length === requiredItems.length,
    resubmission,
  };
};

// ── Service handler ──────────────────────────────────────────────────────────

export const getSpec = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', ONBOARDING_MESSAGES.STATUS_FETCHED, 401);
  }
  const data = await buildKycSpec(user);
  return new ServiceSuccess(data, ONBOARDING_MESSAGES.STATUS_FETCHED);
};

/**
 * Returns the keys of items that are required but not yet complete. Used by
 * POST /onboarding/kyc/complete to surface a precise list to the frontend.
 */
export const findIncompleteKeys = async (user: UserRow): Promise<KycItemKey[]> => {
  const items = getKycItemsForRole(user.role).filter((i) => i.enabled && i.required);
  const agg = await loadAggregates(user.id);
  const incomplete: KycItemKey[] = [];
  for (const item of items) {
    const built = buildItemSpec(item, user, agg);
    if (!built.complete) incomplete.push(item.key);
  }
  return incomplete;
};

/**
 * Coarse onboarding-step hint for use at boot-time endpoints (login, register).
 * Mirrors the derivation in `onboarding.service.ts#stepFor` — items over
 * kyc_status — but is spec-aware so it never says "complete" for a user
 * whose required items aren't all filled in. Auth used to compute this
 * from `user.full_name` alone, which silently bypassed the OnboardingGuard
 * whenever a professional had a name but no rates/identity/etc.
 *
 * Rejection short-circuits over everything (matches /onboarding/status).
 * Callers still get a "hint" — the fine-grained routing is owned by
 * GET /onboarding/status.
 */
export const deriveOnboardingStep = async (user: UserRow): Promise<OnboardingStep> => {
  if (user.kyc_status === 'rejected') return 'kyc_rejected';

  // Role not confirmed yet (identical guard to onboarding.service.getStatus).
  if (user.kyc_status === 'none' && !user.full_name) return 'role_selection';

  const incomplete = await findIncompleteKeys(user);
  if (incomplete.length === 0) return 'complete';
  return user.role === 'professional' ? 'professional_kyc' : 'client_kyc';
};

/**
 * Returns the active per-item resubmission set for a user, or null when
 * none is in effect (status not rejected, no flagged items, or the user
 * already resubmitted and is awaiting re-review).
 *
 * PATCH handlers consult this to enforce that out-of-set keys can't be
 * silently rewritten. UI tells the same story but we still defend the
 * server boundary.
 */
export const findActiveResubmitSet = async (user: UserRow): Promise<KycItemKey[] | null> => {
  if (user.kyc_status !== 'rejected') return null;
  const latest = await repo.findLatestKycSubmission(user.id);
  if (!latest || latest.status !== 'rejected') return null;
  const keys = sanitizeItemKeys(latest.reject_item_keys);
  return keys.length === 0 ? null : keys;
};

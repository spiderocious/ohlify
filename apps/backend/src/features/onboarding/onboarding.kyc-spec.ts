import type { UserRole, UserRow } from '@features/auth/auth.types.js';
import * as profileRepo from '@features/profile/profile.repo.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { ONBOARDING_MESSAGES } from './onboarding.messages.js';
import * as repo from './onboarding.repo.js';
import type {
  KycItemConfig,
  KycItemKey,
  KycItemSpec,
  KycSpecResponse,
  KycSubmissionRow,
} from './onboarding.types.js';

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

const buildItemSpec = (
  config: KycItemConfig,
  user: UserRow,
  agg: KycAggregates,
): KycItemSpec => {
  const base = { ...config, value: null as unknown, complete: false };

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
    default:
      // Unknown key from a config row that ships ahead of code. Render as
      // disabled so the frontend hides it cleanly.
      return base;
  }
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
 */
export const buildKycSpec = async (
  user: UserRow,
): Promise<KycSpecResponse> => {
  const items = getKycItemsForRole(user.role);
  const agg = await loadAggregates(user.id);
  const built = items
    .filter((i) => i.enabled)
    .map((i) => buildItemSpec(i, user, agg));
  const requiredItems = built.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.complete);
  return {
    role: user.role,
    items: built,
    completed_count: completedRequired.length,
    total_required: requiredItems.length,
    all_complete:
      requiredItems.length > 0 && completedRequired.length === requiredItems.length,
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

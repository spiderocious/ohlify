import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';

// Centralized access to runtime-tunable platform settings.
//
// Source of truth: the `platform_config` table (seeded by migration 0016 +
// 0036; admin-tunable in §21). Reads are served from an in-process snapshot
// that refreshes every 5 minutes. The accessors below are SYNCHRONOUS so
// hot paths (every list query, every availability slot computation) don't
// have to become async — the snapshot is preloaded at boot via
// initPlatformConfig() and refreshed on a timer. Callers always get a
// well-typed slice; missing rows fall through to compiled-in defaults.

export interface RateConfig {
  min_kobo: number;
  max_kobo: number;
  allowed_durations_minutes: readonly number[];
}

export interface BankAccountConfig {
  min_name_match_percent: number;
}

export interface HandleConfig {
  change_cooldown_days: number;
  redirect_days: number;
}

export interface KycConfig {
  auto_approve: boolean;
}

export interface AvailabilityConfig {
  daily_start_hour: number;
  daily_end_hour: number;
  slot_minutes: number;
  default_window_days: number;
  max_window_days: number;
  no_instant_booking_minutes: number;
  default_timezone: string;
}

export interface SupportConfig {
  email: string;
  whatsapp_number: string;
  whatsapp_deeplink: string;
}

export interface WalletConfig {
  withdrawal_cooldown_seconds: number;
  max_withdrawals_per_day: number;
  max_withdrawal_per_day_kobo: number;
  min_withdrawal_kobo: number;
  min_funding_kobo: number;
  max_funding_kobo: number;
  payout_mode: 'instant' | 'daily_batch' | 'manual_review';
  platform_fee_bps: number;
}

// Compiled-in defaults — used until the first DB load lands AND when an
// individual key is absent from the DB. Mirror the seeded values.
const DEFAULT_SNAPSHOT: ConfigSnapshot = {
  rate: {
    min_kobo: 50_000,
    max_kobo: 50_000_000,
    allowed_durations_minutes: [5, 10, 15, 20, 25, 30, 45, 60],
  },
  bankAccount: {
    min_name_match_percent: 45,
  },
  handle: {
    change_cooldown_days: 30,
    redirect_days: 90,
  },
  kyc: {
    auto_approve: true,
  },
  availability: {
    daily_start_hour: 9,
    daily_end_hour: 21,
    slot_minutes: 30,
    default_window_days: 14,
    max_window_days: 30,
    no_instant_booking_minutes: 30,
    default_timezone: 'Africa/Lagos',
  },
  support: {
    email: 'support@ohlify.com',
    whatsapp_number: '+2348000000000',
    whatsapp_deeplink: 'https://wa.me/2348000000000',
  },
  wallet: {
    withdrawal_cooldown_seconds: 60,
    max_withdrawals_per_day: 5,
    max_withdrawal_per_day_kobo: 10_000_000,
    min_withdrawal_kobo: 100_000,
    min_funding_kobo: 50_000,
    max_funding_kobo: 100_000_000,
    payout_mode: 'instant',
    platform_fee_bps: 1500,
  },
};

interface ConfigSnapshot {
  rate: RateConfig;
  bankAccount: BankAccountConfig;
  handle: HandleConfig;
  kyc: KycConfig;
  availability: AvailabilityConfig;
  support: SupportConfig;
  wallet: WalletConfig;
}

let snapshot: ConfigSnapshot = DEFAULT_SNAPSHOT;
let lastRefreshAt = 0;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let refreshInFlight: Promise<void> | null = null;

interface ConfigRow {
  key: string;
  value: unknown;
  is_public: boolean;
}

const num = (v: unknown, fallback: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const str = (v: unknown, fallback: string): string => {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
};

const bool = (v: unknown, fallback: boolean): boolean => {
  if (typeof v === 'boolean') return v;
  return fallback;
};

const numArr = (v: unknown, fallback: readonly number[]): readonly number[] => {
  if (Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return v as number[];
  }
  return fallback;
};

const buildSnapshot = (rows: ConfigRow[]): ConfigSnapshot => {
  const map = new Map<string, unknown>();
  for (const row of rows) map.set(row.key, row.value);

  const get = <T>(key: string, fallback: T): unknown => map.get(key) ?? fallback;
  const d = DEFAULT_SNAPSHOT;

  return {
    rate: {
      min_kobo: num(get('rates.min_kobo', d.rate.min_kobo), d.rate.min_kobo),
      max_kobo: num(get('rates.max_kobo', d.rate.max_kobo), d.rate.max_kobo),
      allowed_durations_minutes: numArr(
        get('rates.allowed_durations_minutes', d.rate.allowed_durations_minutes),
        d.rate.allowed_durations_minutes,
      ),
    },
    bankAccount: {
      min_name_match_percent: num(
        get('bank_account.min_name_match_percent', d.bankAccount.min_name_match_percent),
        d.bankAccount.min_name_match_percent,
      ),
    },
    handle: {
      change_cooldown_days: num(
        get('handle.change_cooldown_days', d.handle.change_cooldown_days),
        d.handle.change_cooldown_days,
      ),
      redirect_days: num(
        get('handle.redirect_days', d.handle.redirect_days),
        d.handle.redirect_days,
      ),
    },
    kyc: {
      auto_approve: bool(get('kyc.auto_approve', d.kyc.auto_approve), d.kyc.auto_approve),
    },
    availability: {
      daily_start_hour: num(
        get('availability.daily_start_hour', d.availability.daily_start_hour),
        d.availability.daily_start_hour,
      ),
      daily_end_hour: num(
        get('availability.daily_end_hour', d.availability.daily_end_hour),
        d.availability.daily_end_hour,
      ),
      slot_minutes: num(
        get('availability.slot_minutes', d.availability.slot_minutes),
        d.availability.slot_minutes,
      ),
      default_window_days: num(
        get('availability.default_window_days', d.availability.default_window_days),
        d.availability.default_window_days,
      ),
      max_window_days: num(
        get('availability.max_window_days', d.availability.max_window_days),
        d.availability.max_window_days,
      ),
      no_instant_booking_minutes: num(
        get('availability.no_instant_booking_minutes', d.availability.no_instant_booking_minutes),
        d.availability.no_instant_booking_minutes,
      ),
      default_timezone: str(
        get('availability.default_timezone', d.availability.default_timezone),
        d.availability.default_timezone,
      ),
    },
    support: {
      email: str(get('support.email', d.support.email), d.support.email),
      whatsapp_number: str(
        get('support.whatsapp_number', d.support.whatsapp_number),
        d.support.whatsapp_number,
      ),
      whatsapp_deeplink: str(
        get('support.whatsapp_deeplink', d.support.whatsapp_deeplink),
        d.support.whatsapp_deeplink,
      ),
    },
    wallet: {
      withdrawal_cooldown_seconds: num(
        get('wallet.withdrawal_cooldown_seconds', d.wallet.withdrawal_cooldown_seconds),
        d.wallet.withdrawal_cooldown_seconds,
      ),
      max_withdrawals_per_day: num(
        get('wallet.max_withdrawals_per_day', d.wallet.max_withdrawals_per_day),
        d.wallet.max_withdrawals_per_day,
      ),
      max_withdrawal_per_day_kobo: num(
        get('wallet.max_withdrawal_per_day_kobo', d.wallet.max_withdrawal_per_day_kobo),
        d.wallet.max_withdrawal_per_day_kobo,
      ),
      min_withdrawal_kobo: num(
        get('wallet.min_withdrawal_kobo', d.wallet.min_withdrawal_kobo),
        d.wallet.min_withdrawal_kobo,
      ),
      min_funding_kobo: num(
        get('wallet.min_funding_kobo', d.wallet.min_funding_kobo),
        d.wallet.min_funding_kobo,
      ),
      max_funding_kobo: num(
        get('wallet.max_funding_kobo', d.wallet.max_funding_kobo),
        d.wallet.max_funding_kobo,
      ),
      payout_mode: ((): WalletConfig['payout_mode'] => {
        const v = get('wallet.payout_mode', d.wallet.payout_mode);
        if (v === 'instant' || v === 'daily_batch' || v === 'manual_review') return v;
        return d.wallet.payout_mode;
      })(),
      platform_fee_bps: num(
        get('platform.fee_bps', d.wallet.platform_fee_bps),
        d.wallet.platform_fee_bps,
      ),
    },
  };
};

const loadFromDb = async (): Promise<void> => {
  try {
    const res = await pool.query<ConfigRow>(`SELECT key, value, is_public FROM platform_config`);
    snapshot = buildSnapshot(res.rows);
    lastRefreshAt = Date.now();
  } catch (err) {
    logger.warn({ err }, 'platform_config refresh failed; serving previous snapshot');
  }
};

// Loads the snapshot eagerly. Call from server.ts before buildApp(). Idempotent.
export const initPlatformConfig = async (): Promise<void> => {
  await loadFromDb();
  setInterval(() => {
    void loadFromDb();
  }, REFRESH_INTERVAL_MS).unref();
};

// On-demand refresh — called by the admin PATCH path (when §21 ships) and by
// integration tests that want immediate consistency.
export const reloadPlatformConfig = async (): Promise<void> => {
  if (refreshInFlight !== null) {
    await refreshInFlight;
    return;
  }
  refreshInFlight = loadFromDb().finally(() => {
    refreshInFlight = null;
  });
  await refreshInFlight;
};

// Exposed for the /config/public endpoint — returns the raw rows so the
// controller can filter by is_public and serialize the value column directly.
export const listPublicConfigRows = async (): Promise<{ key: string; value: unknown }[]> => {
  const res = await pool.query<{ key: string; value: unknown }>(
    `SELECT key, value FROM platform_config WHERE is_public = TRUE ORDER BY key ASC`,
  );
  return res.rows;
};

export const platformConfig = {
  rate: (): RateConfig => snapshot.rate,
  bankAccount: (): BankAccountConfig => snapshot.bankAccount,
  handle: (): HandleConfig => snapshot.handle,
  kyc: (): KycConfig => snapshot.kyc,
  availability: (): AvailabilityConfig => snapshot.availability,
  support: (): SupportConfig => snapshot.support,
  wallet: (): WalletConfig => snapshot.wallet,
  // For diagnostics — when was the snapshot last refreshed?
  snapshotAge: (): number => Date.now() - lastRefreshAt,
};

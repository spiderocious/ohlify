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
  fee_mode: 'deduct_from_payee' | 'add_to_payer';
  min_billable_seconds: number;
  caller_no_show_refund_pct_bps: number;
  caller_no_show_payee_pct_bps: number;
}

export interface BookingsConfig {
  no_show_grace_seconds: number;
  cancel_window_minutes: number;
  inside_window_penalty_bps: number;
  network_flap_window_seconds: number;
  token_expires_seconds: number;
}

export interface ProfessionalConfig {
  strike_on_no_show: boolean;
  strike_on_late_cancel: boolean;
  strike_on_mid_call_quit: boolean;
  strikes_before_ban: number;
  strike_dispute_window_days: number;
}

export interface CallerConfig {
  strike_on_no_show: boolean;
  strike_on_disconnect: boolean;
  strikes_before_ban: number;
  strike_dispute_window_days: number;
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
    fee_mode: 'deduct_from_payee',
    min_billable_seconds: 30,
    caller_no_show_refund_pct_bps: 2000,
    caller_no_show_payee_pct_bps: 8000,
  },
  bookings: {
    no_show_grace_seconds: 300,
    cancel_window_minutes: 60,
    inside_window_penalty_bps: 3000,
    network_flap_window_seconds: 60,
    token_expires_seconds: 3600,
  },
  professional: {
    strike_on_no_show: true,
    strike_on_late_cancel: true,
    strike_on_mid_call_quit: true,
    strikes_before_ban: 3,
    strike_dispute_window_days: 14,
  },
  caller: {
    strike_on_no_show: true,
    strike_on_disconnect: true,
    strikes_before_ban: 5,
    strike_dispute_window_days: 14,
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
  bookings: BookingsConfig;
  professional: ProfessionalConfig;
  caller: CallerConfig;
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
        get('wallet.platform_fee_bps', d.wallet.platform_fee_bps),
        d.wallet.platform_fee_bps,
      ),
      fee_mode: ((): WalletConfig['fee_mode'] => {
        const v = get('wallet.fee_mode', d.wallet.fee_mode);
        if (v === 'deduct_from_payee' || v === 'add_to_payer') return v;
        return d.wallet.fee_mode;
      })(),
      min_billable_seconds: num(
        get('wallet.min_billable_seconds', d.wallet.min_billable_seconds),
        d.wallet.min_billable_seconds,
      ),
      caller_no_show_refund_pct_bps: num(
        get('wallet.caller_no_show_refund_pct_bps', d.wallet.caller_no_show_refund_pct_bps),
        d.wallet.caller_no_show_refund_pct_bps,
      ),
      caller_no_show_payee_pct_bps: num(
        get('wallet.caller_no_show_payee_pct_bps', d.wallet.caller_no_show_payee_pct_bps),
        d.wallet.caller_no_show_payee_pct_bps,
      ),
    },
    bookings: {
      no_show_grace_seconds: num(
        get('bookings.no_show_grace_seconds', d.bookings.no_show_grace_seconds),
        d.bookings.no_show_grace_seconds,
      ),
      cancel_window_minutes: num(
        get('bookings.cancel_window_minutes', d.bookings.cancel_window_minutes),
        d.bookings.cancel_window_minutes,
      ),
      inside_window_penalty_bps: num(
        get('bookings.inside_window_penalty_bps', d.bookings.inside_window_penalty_bps),
        d.bookings.inside_window_penalty_bps,
      ),
      network_flap_window_seconds: num(
        get('bookings.network_flap_window_seconds', d.bookings.network_flap_window_seconds),
        d.bookings.network_flap_window_seconds,
      ),
      token_expires_seconds: num(
        get('bookings.token_expires_seconds', d.bookings.token_expires_seconds),
        d.bookings.token_expires_seconds,
      ),
    },
    professional: {
      strike_on_no_show: bool(
        get('professional.strike_on_no_show', d.professional.strike_on_no_show),
        d.professional.strike_on_no_show,
      ),
      strike_on_late_cancel: bool(
        get('professional.strike_on_late_cancel', d.professional.strike_on_late_cancel),
        d.professional.strike_on_late_cancel,
      ),
      strike_on_mid_call_quit: bool(
        get('professional.strike_on_mid_call_quit', d.professional.strike_on_mid_call_quit),
        d.professional.strike_on_mid_call_quit,
      ),
      strikes_before_ban: num(
        get('professional.strikes_before_ban', d.professional.strikes_before_ban),
        d.professional.strikes_before_ban,
      ),
      strike_dispute_window_days: num(
        get('professional.strike_dispute_window_days', d.professional.strike_dispute_window_days),
        d.professional.strike_dispute_window_days,
      ),
    },
    caller: {
      strike_on_no_show: bool(
        get('caller.strike_on_no_show', d.caller.strike_on_no_show),
        d.caller.strike_on_no_show,
      ),
      strike_on_disconnect: bool(
        get('caller.strike_on_disconnect', d.caller.strike_on_disconnect),
        d.caller.strike_on_disconnect,
      ),
      strikes_before_ban: num(
        get('caller.strikes_before_ban', d.caller.strikes_before_ban),
        d.caller.strikes_before_ban,
      ),
      strike_dispute_window_days: num(
        get('caller.strike_dispute_window_days', d.caller.strike_dispute_window_days),
        d.caller.strike_dispute_window_days,
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
  bookings: (): BookingsConfig => snapshot.bookings,
  professional: (): ProfessionalConfig => snapshot.professional,
  caller: (): CallerConfig => snapshot.caller,
  // For diagnostics — when was the snapshot last refreshed?
  snapshotAge: (): number => Date.now() - lastRefreshAt,
};

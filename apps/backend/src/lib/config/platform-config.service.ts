// Centralized read-only access to runtime-tunable platform settings.
//
// Today: returns built-in defaults (kept in sync with migration 0016 seed).
// Tomorrow: same surface, but backed by a SELECT against `platform_config`
// (admin-tunable per docs/policies.md + api-needed.md §22). Callers don't
// change. Add caching here when reads get hot.

export interface RateConfig {
  min_kobo: number;
  max_kobo: number;
  allowed_durations_minutes: readonly number[];
}

export interface BankAccountConfig {
  // Minimum acceptable Jaro-Winkler-derived similarity (percent, 0-100) between
  // the user's full_name and the Paystack-resolved account_name. Below this,
  // PUT /me/bank-account returns 422 account_name_mismatch.
  min_name_match_percent: number;
}

export interface HandleConfig {
  change_cooldown_days: number;
  redirect_days: number;
}

export interface KycConfig {
  auto_approve: boolean;
}

// Default daily booking window for professionals. Per-pro overrides will land
// later — for now every pro shares the same window. Server treats the window
// as IANA `Africa/Lagos` and emits UTC instants in the availability response.
export interface AvailabilityConfig {
  daily_start_hour: number; // 0-23, inclusive
  daily_end_hour: number; // 0-23, exclusive (e.g. 21 means slots stop at 20:30)
  slot_minutes: number; // grid granularity
  default_window_days: number;
  max_window_days: number;
  no_instant_booking_minutes: number;
  default_timezone: string;
}

const RATE_CONFIG: RateConfig = {
  min_kobo: 50_000,
  max_kobo: 50_000_000,
  allowed_durations_minutes: [5, 10, 15, 20, 25, 30, 45, 60],
};

const BANK_ACCOUNT_CONFIG: BankAccountConfig = {
  min_name_match_percent: 45,
};

const HANDLE_CONFIG: HandleConfig = {
  change_cooldown_days: 30,
  redirect_days: 90,
};

const KYC_CONFIG: KycConfig = {
  auto_approve: true,
};

const AVAILABILITY_CONFIG: AvailabilityConfig = {
  daily_start_hour: 9,
  daily_end_hour: 21,
  slot_minutes: 30,
  default_window_days: 14,
  max_window_days: 30,
  no_instant_booking_minutes: 30,
  default_timezone: 'Africa/Lagos',
};

export const platformConfig = {
  rate: (): RateConfig => RATE_CONFIG,
  bankAccount: (): BankAccountConfig => BANK_ACCOUNT_CONFIG,
  handle: (): HandleConfig => HANDLE_CONFIG,
  kyc: (): KycConfig => KYC_CONFIG,
  availability: (): AvailabilityConfig => AVAILABILITY_CONFIG,
};

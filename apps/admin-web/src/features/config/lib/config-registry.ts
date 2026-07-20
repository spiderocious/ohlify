/**
 * Hand-curated registry of every known platform_config key.
 *
 * The backend stores values as raw JSON in `platform_config.value`. The
 * UI shouldn't expose that — operators want to think in nairas, percents,
 * minutes, and toggles, not basis-points and stringified booleans.
 *
 * This file is the bridge: each entry says how to render one key (kind,
 * unit, min/max, label, help text) and how to round-trip the user's input
 * back into the JSON shape the backend expects.
 *
 * Adding a new key:
 *   1. Pick the closest `kind` below.
 *   2. Add the entry to KNOWN_KEYS in the right group.
 *   3. If the kind doesn't exist, add it to the union + render it in the
 *      ConfigField component.
 *
 * Unknown keys (anything not in KNOWN_KEYS) fall back to the raw-JSON
 * editor — they still work, they just look like the old screen.
 */

export type ConfigKind =
  | 'money_kobo' // value is integer kobo. UI shows ₦ with decimals.
  | 'percent_bps' // value is integer basis points (10000 = 100%). UI shows %.
  | 'duration_seconds'
  | 'duration_minutes'
  | 'duration_days'
  | 'boolean' // value is true|false. UI shows a toggle.
  | 'enum' // value is one of `enumOptions`. UI shows a dropdown.
  | 'string' // value is a plain JSON string. UI shows a text input.
  | 'string_array' // value is JSON array of strings. UI shows tag input.
  | 'number_array' // value is JSON array of numbers (e.g. allowed durations).
  | 'number'; // value is a plain integer. UI shows a number input.

export interface ConfigKeyDef {
  key: string;
  kind: ConfigKind;
  label: string;
  help?: string;
  /** Min/max for numeric / duration kinds. Inclusive. */
  min?: number;
  max?: number;
  /** For 'enum' kind only. */
  enumOptions?: ReadonlyArray<{ value: string; label: string }>;
  /** Group prefix → tab/section name, e.g. 'wallet'. Defaults to first dot-segment. */
  group?: string;
}

export interface ConfigGroup {
  id: string;
  label: string;
  /** Lower = earlier in the section list. */
  order: number;
}

export const CONFIG_GROUPS: ReadonlyArray<ConfigGroup> = [
  { id: 'wallet', label: 'Wallet & payouts', order: 10 },
  { id: 'bookings', label: 'Bookings & calls', order: 20 },
  { id: 'presence', label: 'Presence & heartbeat', order: 25 },
  { id: 'rates', label: 'Rates', order: 30 },
  { id: 'professional', label: 'Pro strikes', order: 40 },
  { id: 'caller', label: 'Caller strikes', order: 50 },
  { id: 'kyc', label: 'KYC', order: 60 },
  { id: 'handle', label: 'Handles', order: 70 },
  { id: 'auth', label: 'Auth & OTP', order: 80 },
  { id: 'features', label: 'Feature flags', order: 90 },
  { id: 'support', label: 'Support contact', order: 100 },
  { id: 'platform', label: 'Platform', order: 110 },
  { id: 'other', label: 'Other', order: 999 },
];

/**
 * The actual catalogue. Keep this in sync with the seeded values across
 * migrations 0016, 0036, 0047, 0049, 0051, 0062, 0076.
 */
export const KNOWN_KEYS: ReadonlyArray<ConfigKeyDef> = [
  // ── auth ────────────────────────────────────────────────────────────────
  {
    key: 'auth.otp_ttl_seconds',
    kind: 'duration_seconds',
    label: 'OTP lifetime',
    help: 'How long an OTP code stays valid after issuance.',
    min: 60,
    max: 3600,
  },
  {
    key: 'auth.otp_resend_seconds',
    kind: 'duration_seconds',
    label: 'OTP resend cooldown',
    help: 'How long the user must wait before requesting another OTP.',
    min: 10,
    max: 600,
  },

  // ── booking + bookings (legacy + new namespace) ────────────────────────
  {
    key: 'booking.cancel_window_minutes',
    kind: 'duration_minutes',
    label: 'Cancel window (legacy)',
    help: 'Minutes before scheduled time during which a booking can be cancelled without penalty. Newer code reads bookings.cancel_window_minutes — keep them in sync.',
    min: 0,
    max: 1440,
  },
  {
    key: 'booking.reschedule_window_minutes',
    kind: 'duration_minutes',
    label: 'Reschedule window',
    help: 'Minutes before scheduled time during which a booking can be rescheduled.',
    min: 0,
    max: 1440,
  },
  {
    key: 'booking.join_window_minutes',
    kind: 'duration_minutes',
    label: 'Join window',
    help: 'Minutes before scheduled time at which the join button becomes active.',
    min: 0,
    max: 60,
  },
  {
    key: 'booking.missed_call_grace_minutes',
    kind: 'duration_minutes',
    label: 'Missed-call grace',
    help: 'Minutes after the scheduled time before a no-show is recorded.',
    min: 0,
    max: 60,
  },
  {
    key: 'booking.payment_hold_minutes',
    kind: 'duration_minutes',
    label: 'Payment hold',
    help: 'How long pending_debits remain reserved before timeout.',
    min: 1,
    max: 1440,
  },
  {
    key: 'bookings.no_show_grace_seconds',
    kind: 'duration_seconds',
    label: 'No-show grace (calls slice)',
    min: 0,
    max: 3600,
  },
  {
    key: 'bookings.cancel_window_minutes',
    kind: 'duration_minutes',
    label: 'Cancel window',
    help: 'Authoritative cancel-window for the calls/bookings slice.',
    min: 0,
    max: 1440,
  },
  {
    key: 'bookings.inside_window_penalty_bps',
    kind: 'percent_bps',
    label: 'Inside-window cancel penalty',
    help: 'Percentage of the booking amount kept as penalty when caller cancels inside the window.',
    min: 0,
    max: 10000,
  },
  {
    key: 'bookings.network_flap_window_seconds',
    kind: 'duration_seconds',
    label: 'Network flap window',
    help: 'Window during which a brief disconnect/reconnect is treated as the same connected session.',
    min: 0,
    max: 600,
  },
  {
    key: 'bookings.token_expires_seconds',
    kind: 'duration_seconds',
    label: 'Agora RTC token TTL',
    min: 60,
    max: 86400,
  },

  // ── presence ────────────────────────────────────────────────────────────
  {
    key: 'presence.heartbeat_enabled',
    kind: 'boolean',
    label: 'Heartbeat enabled',
    help: 'Dead switch. When OFF, neither mobile app (React Native or Flutter) ever calls the presence heartbeat endpoint — instant-call reachability then always resolves to offline for every professional. Public.',
    group: 'presence',
  },
  {
    key: 'presence.heartbeat_interval_seconds',
    kind: 'duration_seconds',
    label: 'Heartbeat interval',
    help: 'How often an online professional’s app pings the heartbeat endpoint. Public — both mobile apps read this to schedule their timer.',
    min: 5,
    max: 600,
    group: 'presence',
  },
  {
    key: 'presence.online_window_seconds',
    kind: 'duration_seconds',
    label: 'Online window',
    help: 'How stale a professional’s last heartbeat can be before they’re considered offline for instant-call reachability. Server-only — not exposed to clients. Keep comfortably above the heartbeat interval to tolerate a missed ping or two.',
    min: 10,
    max: 3600,
    group: 'presence',
  },
  {
    key: 'presence.ring_timeout_seconds',
    kind: 'duration_seconds',
    label: 'Ring timeout',
    help: 'How long an instant call rings the callee before giving up as unavailable.',
    min: 5,
    max: 120,
    group: 'presence',
  },

  // ── rates ────────────────────────────────────────────────────────────────
  {
    key: 'rates.min_kobo',
    kind: 'money_kobo',
    label: 'Minimum rate',
    help: 'Smallest amount a pro can set for any rate.',
    min: 0,
  },
  {
    key: 'rates.max_kobo',
    kind: 'money_kobo',
    label: 'Maximum rate',
    help: 'Largest amount a pro can set for any rate.',
    min: 0,
  },
  {
    key: 'rates.allowed_durations_minutes',
    kind: 'number_array',
    label: 'Allowed durations',
    help: 'Comma-separated minutes, e.g. 5, 10, 15, 30, 60.',
  },
  {
    key: 'rates.allowed_call_types',
    kind: 'string_array',
    label: 'Allowed call types',
    help: 'Comma-separated call types, e.g. audio, video.',
  },
  {
    key: 'rates.single_rate_per_channel',
    kind: 'boolean',
    label: 'Single rate per channel',
    help: 'Calls revamp: pros set one rate per call type; per-minute price is derived (floored). When off, pros set multiple duration packages.',
  },

  // ── wallet ──────────────────────────────────────────────────────────────
  {
    key: 'wallet.min_withdrawal_kobo',
    kind: 'money_kobo',
    label: 'Minimum withdrawal',
    min: 0,
  },
  {
    key: 'wallet.max_withdrawal_per_day_kobo',
    kind: 'money_kobo',
    label: 'Daily withdrawal cap',
    min: 0,
  },
  {
    key: 'wallet.payout_mode',
    kind: 'enum',
    label: 'Payout mode',
    help: 'instant = transfer kicks off immediately on user request. manual_review = withdrawals queue for admin approval.',
    enumOptions: [
      { value: 'instant', label: 'Instant' },
      { value: 'manual_review', label: 'Manual review' },
    ],
  },
  {
    key: 'wallet.platform_fee_bps',
    kind: 'percent_bps',
    label: 'Platform fee',
    help: 'Percentage of every settled call that goes to platform_revenue.',
    min: 0,
    max: 10000,
  },
  {
    key: 'wallet.fee_mode',
    kind: 'enum',
    label: 'Fee allocation',
    help: 'add_to_payer = caller pays rate + fee on top. deduct_from_payee = pro receives rate − fee.',
    enumOptions: [
      { value: 'add_to_payer', label: 'Add to payer' },
      { value: 'deduct_from_payee', label: 'Deduct from payee' },
    ],
  },
  {
    key: 'wallet.min_billable_seconds',
    kind: 'duration_seconds',
    label: 'Minimum billable duration',
    help: 'Calls connected for less than this round to zero charge.',
    min: 0,
    max: 600,
  },
  {
    key: 'wallet.caller_no_show_refund_pct_bps',
    kind: 'percent_bps',
    label: 'Caller no-show refund %',
    help: 'Percentage of the booking refunded to the caller when the caller no-shows.',
    min: 0,
    max: 10000,
  },
  {
    key: 'wallet.caller_no_show_payee_pct_bps',
    kind: 'percent_bps',
    label: 'Caller no-show payee %',
    help: 'Percentage of the booking paid to the pro when the caller no-shows. (refund + payee should usually sum to 100%.)',
    min: 0,
    max: 10000,
  },
  {
    key: 'wallet.withdrawal_cooldown_seconds',
    kind: 'duration_seconds',
    label: 'Withdrawal cooldown',
    help: 'Minimum time between consecutive withdrawal requests for the same user.',
    min: 0,
    max: 86400,
  },
  {
    key: 'wallet.max_withdrawals_per_day',
    kind: 'number',
    label: 'Withdrawals per day',
    help: 'Hard cap on number of withdrawals a single user can request in 24h.',
    min: 1,
    max: 100,
  },
  {
    key: 'wallet.min_funding_kobo',
    kind: 'money_kobo',
    label: 'Minimum funding',
    min: 0,
  },
  {
    key: 'wallet.max_funding_kobo',
    kind: 'money_kobo',
    label: 'Maximum funding (single)',
    help: 'Largest single Paystack charge accepted.',
    min: 0,
  },

  // ── kyc ────────────────────────────────────────────────────────────────
  {
    key: 'kyc.auto_approve',
    kind: 'boolean',
    label: 'Auto-approve KYC',
    help: 'When ON, every kyc/complete call flips users.kyc_status to approved without admin review. Turn OFF to put submissions into the admin queue.',
  },

  // ── handle ─────────────────────────────────────────────────────────────
  {
    key: 'handle.change_cooldown_days',
    kind: 'duration_days',
    label: 'Handle change cooldown',
    help: 'Days a user must wait between handle renames.',
    min: 0,
    max: 365,
  },
  {
    key: 'handle.redirect_days',
    kind: 'duration_days',
    label: 'Old-handle redirect lifetime',
    help: 'Days the old handle stays redirected to the new one before being released.',
    min: 0,
    max: 365,
  },

  // ── features ───────────────────────────────────────────────────────────
  {
    key: 'features.public_web_booking',
    kind: 'boolean',
    label: 'Public web booking',
    help: 'Allow unauthenticated users to start a booking from the public web.',
  },
  {
    key: 'features.calendar_ics',
    kind: 'boolean',
    label: 'Calendar (.ics) export',
    help: 'Surface .ics download for confirmed bookings.',
  },
  {
    key: 'features.banners_enabled',
    kind: 'boolean',
    label: 'Banners enabled',
    help: 'Master switch for the banners feature in mobile + web.',
  },

  // ── platform (legacy alias) ────────────────────────────────────────────
  {
    key: 'platform.fee_bps',
    kind: 'percent_bps',
    label: 'Platform fee (legacy alias)',
    help: 'Old key — kept for back-compat. New code reads wallet.platform_fee_bps. Keep in sync with that.',
    min: 0,
    max: 10000,
  },

  // ── support ────────────────────────────────────────────────────────────
  {
    key: 'support.email',
    kind: 'string',
    label: 'Support email',
  },
  {
    key: 'support.whatsapp_number',
    kind: 'string',
    label: 'Support WhatsApp number',
    help: 'E.164 format, e.g. +2348000000000.',
  },
  {
    key: 'support.whatsapp_deeplink',
    kind: 'string',
    label: 'Support WhatsApp deeplink',
    help: 'wa.me link the customer apps render in the help section.',
  },

  // ── professional strikes ───────────────────────────────────────────────
  {
    key: 'professional.strike_on_no_show',
    kind: 'boolean',
    label: 'Strike on no-show',
    help: 'Auto-issue a strike when a pro no-shows for a confirmed call.',
  },
  {
    key: 'professional.strike_on_late_cancel',
    kind: 'boolean',
    label: 'Strike on late cancel',
    help: 'Auto-issue a strike when a pro cancels inside the cancel window.',
  },
  {
    key: 'professional.strike_on_mid_call_quit',
    kind: 'boolean',
    label: 'Strike on mid-call quit',
    help: 'Auto-issue a strike when a pro disconnects mid-call without rejoining.',
  },
  {
    key: 'professional.strikes_before_ban',
    kind: 'number',
    label: 'Strikes before ban (pro)',
    help: 'Number of active strikes that auto-suspends a pro.',
    min: 1,
    max: 20,
  },
  {
    key: 'professional.strike_dispute_window_days',
    kind: 'duration_days',
    label: 'Strike dispute window (pro)',
    help: 'Days a pro has to dispute a fresh strike.',
    min: 0,
    max: 90,
  },

  // ── caller strikes ─────────────────────────────────────────────────────
  {
    key: 'caller.strike_on_no_show',
    kind: 'boolean',
    label: 'Strike on no-show (caller)',
  },
  {
    key: 'caller.strike_on_disconnect',
    kind: 'boolean',
    label: 'Strike on disconnect (caller)',
  },
  {
    key: 'caller.strikes_before_ban',
    kind: 'number',
    label: 'Strikes before ban (caller)',
    min: 1,
    max: 20,
  },
  {
    key: 'caller.strike_dispute_window_days',
    kind: 'duration_days',
    label: 'Strike dispute window (caller)',
    min: 0,
    max: 90,
  },
];

/**
 * Index of known keys for O(1) lookup. Anything not present falls back to
 * raw JSON in the UI.
 */
const KEY_INDEX: Record<string, ConfigKeyDef> = (() => {
  const out: Record<string, ConfigKeyDef> = {};
  for (const def of KNOWN_KEYS) out[def.key] = def;
  return out;
})();

export function findKeyDef(key: string): ConfigKeyDef | null {
  return KEY_INDEX[key] ?? null;
}

/** First dot-segment of the key, mapped to a CONFIG_GROUPS id (or 'other'). */
export function groupOf(def: ConfigKeyDef | null, key: string): string {
  if (def?.group) return def.group;
  const prefix = key.split('.')[0] ?? '';
  if (CONFIG_GROUPS.some((g) => g.id === prefix)) return prefix;
  return 'other';
}

/** "wallet.min_funding_kobo" → "Min funding" when the key is unknown. */
export function humanizeKey(key: string): string {
  const tail = key.split('.').slice(1).join('.');
  return tail
    .replace(/_kobo$|_bps$|_seconds$|_minutes$|_days$/, '')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

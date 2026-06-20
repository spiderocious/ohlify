export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_BLOCKED: 'account_blocked',
  INVALID_OTP: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  OTP_MAX_ATTEMPTS: 'otp_max_attempts',
  EMAIL_EXISTS: 'email_exists',
  PHONE_EXISTS: 'phone_exists',
  TOKEN_INVALID: 'token_invalid',
  SESSION_REVOKED: 'session_revoked',
  SESSION_EXPIRED: 'session_expired',
  CREDENTIAL_NOT_SET: 'credential_not_set',
  UNAUTHORIZED: 'unauthorized',
  // Bookings
  SLOT_TAKEN: 'slot_taken',
  DOUBLE_BOOKING: 'double_booking',
  OUTSIDE_CANCEL_WINDOW: 'outside_cancel_window',
  JOIN_WINDOW_NOT_OPEN: 'join_window_not_open',
  // Wallet
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  NO_BANK_ACCOUNT: 'no_bank_account',
  // Calls + bookings
  RATE_NOT_FOUND: 'rate_not_found',
  PROFESSIONAL_UNAVAILABLE: 'professional_unavailable',
  CANNOT_BOOK_SELF: 'cannot_book_self',
  BOOKING_NOT_FOUND: 'booking_not_found',
  CALL_NOT_FOUND: 'call_not_found',
  CALL_NOT_JOINABLE: 'call_not_joinable',
  STRIKE_NOT_FOUND: 'strike_not_found',
  STRIKE_DISPUTE_WINDOW_CLOSED: 'strike_dispute_window_closed',
  STRIKE_NOT_DISPUTABLE: 'strike_not_disputable',
  // Reviews
  REVIEW_NOT_FOUND: 'review_not_found',
  REVIEW_EXISTS: 'review_exists',
  REVIEW_NOT_ELIGIBLE: 'review_not_eligible',
  // Handles
  HANDLE_TAKEN: 'handle_taken',
  HANDLE_INVALID_FORMAT: 'handle_invalid_format',
  HANDLE_RESERVED: 'handle_reserved',
  HANDLE_COOLDOWN: 'handle_cooldown',
  // Generic
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  VALIDATION_ERROR: 'validation_error',
  VALUE_OUT_OF_RANGE: 'value_out_of_range',
  RATE_LIMITED: 'rate_limited',
  INTERNAL: 'internal',
  UPSTREAM_UNAVAILABLE: 'upstream_unavailable',
  CONFLICT: 'conflict',
  IDEMPOTENCY_MISMATCH: 'idempotency_mismatch',
  // Admin bootstrap (one-shot first-admin creation)
  BOOTSTRAP_DISABLED: 'bootstrap_disabled',
  ALREADY_BOOTSTRAPPED: 'already_bootstrapped',
  // Onboarding / role
  ROLE_ALREADY_SET: 'role_already_set',
  ROLE_REQUIRED: 'role_required',
  ROLE_MISMATCH: 'role_mismatch',
  KYC_INCOMPLETE: 'kyc_incomplete',
  IDENTITY_REQUIRED_FIRST: 'identity_required_first',
  ITEM_NOT_IN_RESUBMIT_SET: 'item_not_in_resubmit_set',
  RESUBMIT_UNCHANGED: 'resubmit_unchanged',
  STRIKE_REASON_ROLE_MISMATCH: 'strike_reason_role_mismatch',
  USER_NOT_FOUND: 'user_not_found',
  // Profile
  ACCOUNT_NAME_MISMATCH: 'account_name_mismatch',
  UNRESOLVABLE_ACCOUNT: 'unresolvable_account',
  CONFIRMATION_REQUIRED: 'confirmation_required',
  BANK_NOT_FOUND: 'bank_not_found',
  CATEGORY_INVALID: 'category_invalid',
  AVATAR_INVALID: 'avatar_invalid',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Numeric severity bands emitted as the wire-level `errorCode`. The last digit
 * encodes how severe / suspicious the failure is, ascending from a benign body
 * typo (1000) to an internal server fault (1009). Clients branch on `reason`
 * (the string identity, i.e. an ErrorCode); `errorCode` is for measurement,
 * alerting and dashboards. See docs/error-envelope-redesign.md.
 */
export const SEVERITY_BANDS = {
  /** Plain request-body validation (Zod, range, format). User typo. */
  BODY_VALIDATION: 1000,
  /** Validation that shouldn't happen from a well-behaved client — possible tampering / client bug. */
  VALIDATION_SUSPICIOUS: 1001,
  /** Authentication failures — bad credentials, OTP, expired/revoked session. */
  AUTH: 1002,
  /** Authenticated but not allowed (role / ownership / account state). */
  FORBIDDEN: 1003,
  /** Resource missing or gone. */
  NOT_FOUND: 1004,
  /** State conflict — slot taken, duplicate, already-set, idempotency mismatch. */
  CONFLICT: 1005,
  /** Domain-rule rejection — insufficient balance, windows, kyc incomplete. Expected, user-facing. */
  BUSINESS_RULE: 1006,
  /** Throttled. */
  RATE_LIMITED: 1007,
  /** Upstream dependency failed — Paystack, Agora, email, file-service. */
  UPSTREAM: 1008,
  /** Our fault — unhandled exception, DB write/constraint failure, broken invariant. */
  SERVER: 1009,
} as const;

export type SeverityBand = (typeof SEVERITY_BANDS)[keyof typeof SEVERITY_BANDS];

/**
 * Maps every error `reason` to its numeric severity band. Any reason not listed
 * falls back to SERVER (1009) at render time, so a forgotten mapping surfaces
 * loudly rather than silently mis-bucketing.
 */
export const ERROR_SEVERITY: Record<ErrorCode, SeverityBand> = {
  // 1000 — body validation
  validation_error: SEVERITY_BANDS.BODY_VALIDATION,
  value_out_of_range: SEVERITY_BANDS.BODY_VALIDATION,
  avatar_invalid: SEVERITY_BANDS.BODY_VALIDATION,
  category_invalid: SEVERITY_BANDS.BODY_VALIDATION,
  handle_invalid_format: SEVERITY_BANDS.BODY_VALIDATION,
  // 1001 — suspicious validation
  cannot_book_self: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  role_mismatch: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  strike_reason_role_mismatch: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  resubmit_unchanged: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  item_not_in_resubmit_set: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  identity_required_first: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  confirmation_required: SEVERITY_BANDS.VALIDATION_SUSPICIOUS,
  // 1002 — auth
  invalid_credentials: SEVERITY_BANDS.AUTH,
  invalid_otp: SEVERITY_BANDS.AUTH,
  otp_expired: SEVERITY_BANDS.AUTH,
  otp_max_attempts: SEVERITY_BANDS.AUTH,
  token_invalid: SEVERITY_BANDS.AUTH,
  session_revoked: SEVERITY_BANDS.AUTH,
  session_expired: SEVERITY_BANDS.AUTH,
  credential_not_set: SEVERITY_BANDS.AUTH,
  unauthorized: SEVERITY_BANDS.AUTH,
  account_locked: SEVERITY_BANDS.AUTH,
  // 1003 — forbidden
  forbidden: SEVERITY_BANDS.FORBIDDEN,
  account_suspended: SEVERITY_BANDS.FORBIDDEN,
  account_blocked: SEVERITY_BANDS.FORBIDDEN,
  bootstrap_disabled: SEVERITY_BANDS.FORBIDDEN,
  role_required: SEVERITY_BANDS.FORBIDDEN,
  // 1004 — not found
  not_found: SEVERITY_BANDS.NOT_FOUND,
  user_not_found: SEVERITY_BANDS.NOT_FOUND,
  rate_not_found: SEVERITY_BANDS.NOT_FOUND,
  booking_not_found: SEVERITY_BANDS.NOT_FOUND,
  call_not_found: SEVERITY_BANDS.NOT_FOUND,
  strike_not_found: SEVERITY_BANDS.NOT_FOUND,
  review_not_found: SEVERITY_BANDS.NOT_FOUND,
  bank_not_found: SEVERITY_BANDS.NOT_FOUND,
  // 1005 — conflict
  conflict: SEVERITY_BANDS.CONFLICT,
  slot_taken: SEVERITY_BANDS.CONFLICT,
  double_booking: SEVERITY_BANDS.CONFLICT,
  email_exists: SEVERITY_BANDS.CONFLICT,
  phone_exists: SEVERITY_BANDS.CONFLICT,
  handle_taken: SEVERITY_BANDS.CONFLICT,
  handle_reserved: SEVERITY_BANDS.CONFLICT,
  review_exists: SEVERITY_BANDS.CONFLICT,
  role_already_set: SEVERITY_BANDS.CONFLICT,
  already_bootstrapped: SEVERITY_BANDS.CONFLICT,
  idempotency_mismatch: SEVERITY_BANDS.CONFLICT,
  // 1006 — business rule
  insufficient_balance: SEVERITY_BANDS.BUSINESS_RULE,
  no_bank_account: SEVERITY_BANDS.BUSINESS_RULE,
  outside_cancel_window: SEVERITY_BANDS.BUSINESS_RULE,
  join_window_not_open: SEVERITY_BANDS.BUSINESS_RULE,
  call_not_joinable: SEVERITY_BANDS.BUSINESS_RULE,
  professional_unavailable: SEVERITY_BANDS.BUSINESS_RULE,
  kyc_incomplete: SEVERITY_BANDS.BUSINESS_RULE,
  strike_dispute_window_closed: SEVERITY_BANDS.BUSINESS_RULE,
  strike_not_disputable: SEVERITY_BANDS.BUSINESS_RULE,
  review_not_eligible: SEVERITY_BANDS.BUSINESS_RULE,
  handle_cooldown: SEVERITY_BANDS.BUSINESS_RULE,
  account_name_mismatch: SEVERITY_BANDS.BUSINESS_RULE,
  unresolvable_account: SEVERITY_BANDS.BUSINESS_RULE,
  // 1007 — rate limited
  rate_limited: SEVERITY_BANDS.RATE_LIMITED,
  // 1008 — upstream
  upstream_unavailable: SEVERITY_BANDS.UPSTREAM,
  // 1009 — server
  internal: SEVERITY_BANDS.SERVER,
};

/** Resolves a reason's numeric severity, defaulting to SERVER for unmapped reasons. */
export const severityFor = (reason: string): SeverityBand =>
  ERROR_SEVERITY[reason as ErrorCode] ?? SEVERITY_BANDS.SERVER;

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
  BOOKING_NOT_FOUND: 'booking_not_found',
  CALL_NOT_FOUND: 'call_not_found',
  CALL_NOT_JOINABLE: 'call_not_joinable',
  STRIKE_NOT_FOUND: 'strike_not_found',
  STRIKE_DISPUTE_WINDOW_CLOSED: 'strike_dispute_window_closed',
  STRIKE_NOT_DISPUTABLE: 'strike_not_disputable',
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
  // Onboarding / role
  ROLE_ALREADY_SET: 'role_already_set',
  ROLE_REQUIRED: 'role_required',
  ROLE_MISMATCH: 'role_mismatch',
  KYC_INCOMPLETE: 'kyc_incomplete',
  // Profile
  ACCOUNT_NAME_MISMATCH: 'account_name_mismatch',
  UNRESOLVABLE_ACCOUNT: 'unresolvable_account',
  CONFIRMATION_REQUIRED: 'confirmation_required',
  BANK_NOT_FOUND: 'bank_not_found',
  CATEGORY_INVALID: 'category_invalid',
  AVATAR_INVALID: 'avatar_invalid',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

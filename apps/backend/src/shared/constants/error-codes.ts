export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  INVALID_OTP: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  EMAIL_EXISTS: 'email_exists',
  PHONE_EXISTS: 'phone_exists',
  UNAUTHORIZED: 'unauthorized',
  // Bookings
  SLOT_TAKEN: 'slot_taken',
  DOUBLE_BOOKING: 'double_booking',
  OUTSIDE_CANCEL_WINDOW: 'outside_cancel_window',
  JOIN_WINDOW_NOT_OPEN: 'join_window_not_open',
  // Wallet
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  NO_BANK_ACCOUNT: 'no_bank_account',
  // Handles
  HANDLE_TAKEN: 'handle_taken',
  HANDLE_INVALID_FORMAT: 'handle_invalid_format',
  HANDLE_RESERVED: 'handle_reserved',
  HANDLE_COOLDOWN: 'handle_cooldown',
  // Generic
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  VALIDATION_ERROR: 'validation_error',
  RATE_LIMITED: 'rate_limited',
  INTERNAL: 'internal',
  CONFLICT: 'conflict',
  IDEMPOTENCY_MISMATCH: 'idempotency_mismatch',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

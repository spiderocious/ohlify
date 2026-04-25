export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  EMAIL_TAKEN: 'auth.email_taken',
  PHONE_TAKEN: 'auth.phone_taken',
  OTP_INVALID: 'auth.otp_invalid',
  OTP_EXPIRED: 'auth.otp_expired',
  TOKEN_EXPIRED: 'auth.token_expired',
  TOKEN_INVALID: 'auth.token_invalid',
  UNAUTHORIZED: 'auth.unauthorized',
  FORBIDDEN: 'auth.forbidden',
  // General
  VALIDATION_ERROR: 'general.validation_error',
  NOT_FOUND: 'general.not_found',
  CONFLICT: 'general.conflict',
  INTERNAL_ERROR: 'general.internal_error',
  TOO_MANY_REQUESTS: 'general.too_many_requests',
  // KYC
  KYC_INCOMPLETE: 'kyc.incomplete',
  HANDLE_TAKEN: 'kyc.handle_taken',
  // Bookings
  BOOKING_CONFLICT: 'booking.conflict',
  BOOKING_NOT_FOUND: 'booking.not_found',
  BOOKING_CANCEL_WINDOW_PASSED: 'booking.cancel_window_passed',
  // Wallet
  INSUFFICIENT_BALANCE: 'wallet.insufficient_balance',
  // Rates
  RATE_NOT_FOUND: 'rate.not_found',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

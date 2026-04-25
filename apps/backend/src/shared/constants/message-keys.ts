// Root message catalog — feature slices add their own AUTH_MESSAGES etc.
// and are spread in here. Kept flat at runtime; split by feature for ownership.

export const MESSAGE_KEYS = {
  // Auth
  USER_REGISTERED: 'auth.register.success',
  USER_LOGGED_IN: 'auth.login.success',
  INVALID_CREDENTIALS: 'auth.login.invalid',
  OTP_SENT: 'auth.otp.sent',
  OTP_INVALID: 'auth.otp.invalid',
  OTP_EXPIRED: 'auth.otp.expired',
  PASSWORD_RESET: 'auth.password.reset',
  LOGGED_OUT: 'auth.logout.success',
  TOKEN_REFRESHED: 'auth.token.refreshed',
  // General
  NOT_FOUND: 'general.not_found',
  FORBIDDEN: 'general.forbidden',
  INTERNAL_ERROR: 'general.internal_error',
  VALIDATION_FAILED: 'general.validation_failed',
  // Profile
  PROFILE_UPDATED: 'profile.updated',
  PASSWORD_CHANGED: 'profile.password_changed',
  ACCOUNT_DELETED: 'profile.account_deleted',
  // KYC
  KYC_SUBMITTED: 'kyc.submitted',
  KYC_APPROVED: 'kyc.approved',
  // Bookings
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_RESCHEDULED: 'booking.rescheduled',
  // Wallet
  WITHDRAWAL_REQUESTED: 'wallet.withdrawal.requested',
  // Feedback
  FEEDBACK_SUBMITTED: 'feedback.submitted',
  // Rates
  RATE_CREATED: 'rate.created',
  RATE_DELETED: 'rate.deleted',
} as const;

export type MessageKey = (typeof MESSAGE_KEYS)[keyof typeof MESSAGE_KEYS];

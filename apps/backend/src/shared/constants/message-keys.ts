export const MESSAGE_KEYS = {
  // Auth
  REGISTER_INITIATED: 'auth.register.initiated',
  REGISTER_SET_CREDENTIAL: 'auth.register.credential_set',
  USER_REGISTERED: 'auth.register.success',
  USER_LOGGED_IN: 'auth.login.success',
  INVALID_CREDENTIALS: 'auth.login.invalid',
  OTP_SENT: 'auth.otp.sent',
  OTP_VERIFIED: 'auth.otp.verified',
  OTP_RESENT: 'auth.otp.resent',
  OTP_INVALID: 'auth.otp.invalid',
  OTP_EXPIRED: 'auth.otp.expired',
  SENSITIVE_OTP_SENT: 'auth.sensitive_otp.sent',
  CREDENTIAL_RESET: 'auth.credential.reset',
  LOGGED_OUT: 'auth.logout.success',
  TOKEN_REFRESHED: 'auth.token.refreshed',
  // General
  NOT_FOUND: 'general.not_found',
  FORBIDDEN: 'general.forbidden',
  INTERNAL_ERROR: 'general.internal_error',
  VALIDATION_FAILED: 'general.validation_failed',
  // Profile
  PROFILE_UPDATED: 'profile.updated',
  CREDENTIAL_CHANGED: 'profile.credential.changed',
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

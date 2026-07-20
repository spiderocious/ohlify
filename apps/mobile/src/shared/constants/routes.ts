/**
 * Mirrors mobile/lib/shared/constants/app_routes.dart. These are React
 * Navigation screen *names*, not URL paths — but kept identical in spelling
 * to the Flutter path constants (minus the leading `/`) so the mapping stays
 * obvious, and because they double as the deep-link path segments (see
 * docs/mobile-work/architecture-spec.md §5 — deep linking is net-new work).
 */
export const ROUTES = {
  root: 'root',
  onboarding: 'onboarding',
  register: 'register',
  createPassword: 'register/create-password',
  verifyOtp: 'register/verify-otp',
  login: 'login',
  forgotPassword: 'forgot-password',
  forgotPasswordVerifyOtp: 'forgot-password/verify-otp',
  resetPassword: 'forgot-password/reset-password',

  // Main app shell
  home: 'home',
  calls: 'calls',
  chats: 'chats',
  wallet: 'wallet',
  profile: 'profile',

  // Profile sub-screens
  profilePersonalInfo: 'profile/personal-info',
  profileRates: 'profile/rates',
  profileBankAccount: 'profile/bank-account',
  profileBookingBlocks: 'profile/booking-blocks',
  profileChangePassword: 'profile/change-password',
  profileNotifications: 'profile/notifications',
  profileHelpDesk: 'profile/help-desk',
  profilePrivacyPolicy: 'profile/privacy-policy',
  profileEula: 'profile/eula',
  profileTerms: 'profile/terms',

  scheduleCall: 'schedule-call',
  professional: 'professional',
  professionals: 'professionals',
  call: 'call',

  // Live call session: call/session/:role/:kind/:selfId/:peerId/:sessionId
  callSessionBase: 'call/session',

  // Onboarding / professional setup
  roleSelection: 'role-selection',
  professionalKyc: 'professional-kyc',
  clientKyc: 'client-kyc',
  kycRejected: 'kyc-rejected',

  notifications: 'notifications',

  componentPreview: 'component-preview',
} as const;

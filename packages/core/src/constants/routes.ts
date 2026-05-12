import { route } from './route.js';

/**
 * Customer-web route table.
 *
 * Mirrors the mobile app's `app_routes.dart` so deep-links work cross-platform.
 * Use `.absPath` for `<Navigate>` / `<Link to>` and `.build({...})` to substitute
 * dynamic params at type-checked-time.
 */
export const ROUTES = route('', {
  ROOT: route(''),
  ONBOARDING: route('onboarding'),

  // Auth
  REGISTER: route('register', {
    CREATE_PASSWORD: route('create-password'),
    VERIFY_OTP: route('verify-otp'),
  }),
  LOGIN: route('login'),
  FORGOT_PASSWORD: route('forgot-password', {
    VERIFY_OTP: route('verify-otp'),
    RESET: route('reset-password'),
  }),

  // Onboarding / role + KYC
  ROLE_SELECTION: route('role-selection'),
  PROFESSIONAL_KYC: route('professional-kyc'),
  CLIENT_KYC: route('client-kyc'),
  KYC_REJECTED: route('kyc-rejected'),

  // Main shell tabs
  HOME: route('home'),
  CALLS: route('calls'),
  WALLET: route('wallet'),
  PROFILE: route('profile', {
    PERSONAL_INFO: route('personal-info'),
    RATES: route('rates'),
    BANK_ACCOUNT: route('bank-account'),
    BOOKING_BLOCKS: route('booking-blocks'),
    CHANGE_PASSWORD: route('change-password'),
    NOTIFICATIONS: route('notifications'),
    HELP_DESK: route('help-desk'),
    PRIVACY_POLICY: route('privacy-policy'),
    EULA: route('eula'),
    TERMS: route('terms'),
  }),

  // Discovery + booking
  PROFESSIONALS: route('professionals'),
  PROFESSIONAL: route('professional/:id'),
  SCHEDULE_CALL: route('schedule-call/:id'),

  // Calls
  CALL: route('call/:id'),
  CALL_SESSION: route('call/session/:role/:kind/:selfId/:peerId/:sessionId'),
  CALL_RATING: route('call/session/rating'),

  // Notifications
  NOTIFICATIONS: route('notifications'),

  // Dev
  COMPONENT_PREVIEW: route('component-preview'),
});

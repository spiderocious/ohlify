const BASE = 'api/v1';

export const EP = {
  // Auth
  AUTH_REGISTER_INITIATE: `${BASE}/auth/register/initiate`,
  AUTH_REGISTER_SET_PASSWORD: `${BASE}/auth/register/set-password`,
  AUTH_REGISTER_VERIFY: `${BASE}/auth/register/verify`,
  AUTH_REGISTER_RESEND_OTP: `${BASE}/auth/register/resend-otp`,
  AUTH_LOGIN: `${BASE}/auth/login`,
  AUTH_REFRESH: `${BASE}/auth/refresh`,
  AUTH_LOGOUT: `${BASE}/auth/logout`,
  AUTH_FP_INITIATE: `${BASE}/auth/forgot-password/initiate`,
  AUTH_FP_VERIFY_OTP: `${BASE}/auth/forgot-password/verify-otp`,
  AUTH_FP_RESET: `${BASE}/auth/forgot-password/reset`,

  // Me
  ME: `${BASE}/me`,
  ME_PASSWORD: `${BASE}/me/password`,
  ME_SENSITIVE_OTP: `${BASE}/me/sensitive-action/otp`,
  ME_EMAIL: `${BASE}/me/email`,
  ME_EMAIL_VERIFY: `${BASE}/me/email/verify`,
  ME_PHONE: `${BASE}/me/phone`,
  ME_PHONE_VERIFY: `${BASE}/me/phone/verify`,
  ME_AVATAR: `${BASE}/me/avatar`,
  ME_BANK_ACCOUNT: `${BASE}/me/bank-account`,
  ME_HANDLE: `${BASE}/me/handle`,
  ME_RATES: `${BASE}/me/rates`,
  ME_RATE: (id: string) => `${BASE}/me/rates/${id}`,
  ME_MINUTES: `${BASE}/me/minutes`,
  ME_MINUTES_BALANCE: `${BASE}/me/minutes/balance`,
  ME_PRESENCE_HEARTBEAT: `${BASE}/me/presence/heartbeat`,
  INSTANT_CALLS: `${BASE}/instant-calls`,
  INSTANT_CALL_INCOMING: `${BASE}/instant-calls/incoming`,
  INSTANT_CALL_ANSWER: (id: string) => `${BASE}/instant-calls/${id}/answer`,
  INSTANT_CALL_END: (id: string) => `${BASE}/instant-calls/${id}/end`,
  CHAT_CONVERSATIONS: `${BASE}/chat/conversations`,
  CHAT_UNREAD_COUNT: `${BASE}/chat/unread-count`,
  CHAT_MESSAGES: (id: string) => `${BASE}/chat/conversations/${id}/messages`,
  CHAT_READ: (id: string) => `${BASE}/chat/conversations/${id}/read`,
  CHAT_CONTEXT: (id: string) => `${BASE}/chat/conversations/${id}/context`,
  CHAT_SCHEDULE: (id: string) => `${BASE}/chat/conversations/${id}/schedule`,
  CHAT_SCHEDULE_ACTION: (messageId: string) => `${BASE}/chat/schedules/${messageId}/action`,
  CHAT_SCHEDULE_RESCHEDULE: (messageId: string) => `${BASE}/chat/schedules/${messageId}/reschedule`,
  ME_NOTIFICATION_PREFS: `${BASE}/me/notification-preferences`,
  ME_BOOKING_BLOCKS: `${BASE}/me/booking-blocks`,
  ME_STRIKES: `${BASE}/me/strikes`,
  ME_DELETE: `${BASE}/me`,

  // Onboarding
  ONBOARDING_STATUS: `${BASE}/onboarding/status`,
  ONBOARDING_ROLE: `${BASE}/onboarding/role`,
  ONBOARDING_KYC_CLIENT: `${BASE}/onboarding/kyc/client`,
  ONBOARDING_KYC_PROFESSIONAL: `${BASE}/onboarding/kyc/professional`,
  ONBOARDING_KYC_SPEC: `${BASE}/onboarding/kyc/spec`,
  ONBOARDING_HANDLE_CHECK: `${BASE}/onboarding/handle/check`,
  ONBOARDING_KYC_COMPLETE: `${BASE}/onboarding/kyc/complete`,

  // Discovery
  HOME: `${BASE}/home`,
  PROFESSIONALS: `${BASE}/professionals`,
  PROFESSIONAL: (id: string) => `${BASE}/professionals/${id}`,
  PROFESSIONAL_RATES: (id: string) => `${BASE}/professionals/${id}/rates`,
  PROFESSIONAL_PRESENCE: (id: string) => `${BASE}/professionals/${id}/presence`,
  PROFESSIONAL_REVIEWS: (id: string) => `${BASE}/professionals/${id}/reviews`,
  PROFESSIONAL_AVAILABILITY: (id: string) => `${BASE}/professionals/${id}/availability`,
  CATEGORIES: `${BASE}/professional-categories`,

  // Calls + Bookings
  BOOKINGS: `${BASE}/bookings`,
  BOOKING: (id: string) => `${BASE}/bookings/${id}`,
  BOOKING_CANCEL: (id: string) => `${BASE}/bookings/${id}/cancel`,
  CALLS: `${BASE}/calls`,
  CALL: (id: string) => `${BASE}/calls/${id}`,
  CALL_HISTORY: `${BASE}/calls/history`,
  CALL_HISTORY_ITEM: (id: string) => `${BASE}/calls/history/${id}`,
  CALL_JOIN: (id: string) => `${BASE}/calls/${id}/join`,
  CALL_LEAVE: (id: string) => `${BASE}/calls/${id}/leave`,
  CALL_RENEW_TOKEN: (id: string) => `${BASE}/calls/${id}/renew-token`,
  CALL_DECLINE: (id: string) => `${BASE}/calls/${id}/decline`,
  CALLS_JOINABLE: `${BASE}/calls/joinable`,
  CALL_RATING: (id: string) => `${BASE}/calls/${id}/rating`,
  CALL_FEEDBACK: (id: string) => `${BASE}/calls/${id}/feedback`,
  CALLS_STATS: `${BASE}/calls/stats`,

  // Wallet
  WALLET: `${BASE}/wallet`,
  WALLET_STATS: `${BASE}/wallet/stats`,
  WALLET_TRANSACTIONS: `${BASE}/wallet/transactions`,
  WALLET_FUND_INIT: `${BASE}/wallet/fund/initialize`,
  WALLET_FUND_VERIFY: `${BASE}/wallet/fund/verify`,
  WALLET_WITHDRAW: `${BASE}/wallet/withdraw`,
  WALLET_WITHDRAWALS: `${BASE}/wallet/withdrawals`,
  WALLET_WITHDRAWAL: (id: string) => `${BASE}/wallet/withdrawals/${id}`,

  // Payments
  PAYMENTS_CALLS_INIT: (callId: string) => `${BASE}/payments/calls/${callId}/initialize`,
  PAYMENTS_REF: (ref: string) => `${BASE}/payments/${ref}`,

  // Banks
  BANKS: `${BASE}/banks`,
  BANKS_RESOLVE: `${BASE}/banks/resolve`,

  // Legal + Help + Config
  LEGAL_EULA: `${BASE}/legal/eula`,
  LEGAL_PRIVACY: `${BASE}/legal/privacy`,
  LEGAL_TERMS: `${BASE}/legal/terms`,
  HELP_FAQS: `${BASE}/help/faqs`,
  HELP_CONTACT: `${BASE}/help/contact`,
  HELP_TICKETS: `${BASE}/help/tickets`,
  CONFIG_PUBLIC: `${BASE}/platform-config/public`,

  // Notifications
  NOTIFICATIONS: `${BASE}/notifications`,
  NOTIFICATION_READ: (id: string) => `${BASE}/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: `${BASE}/notifications/read-all`,
  NOTIFICATION_DEVICES: `${BASE}/notifications/devices`,
  NOTIFICATION_DEVICE: (token: string) => `${BASE}/notifications/devices/${token}`,

  // Uploads
  UPLOADS: `${BASE}/uploads`,
  UPLOADS_PRESIGN: `${BASE}/uploads/presign`,
  UPLOADS_COMPLETE: (uploadId: string) => `${BASE}/uploads/${uploadId}/complete`,
} as const;

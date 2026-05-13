export { apiClient, configureApiClient } from './client.js';
export { createMockQueryClient, registerMock } from './mock-client.js';
export { EP } from './endpoints.js';
export type { ApiError, ApiErrorResponse, ApiResponse } from './types.js';
export { parseApiError } from './types.js';
export { session } from './auth/session.js';
export type {
  OnboardingStep as AuthOnboardingStep,
  AuthUser,
  AuthTokens,
  LoginResponse,
  RegisterVerifyResponse,
  RegisterInitiateResponse,
} from './auth/types.js';
export type {
  OnboardingStep,
  KycStatus,
  KycProgress,
  KycRejection,
  OnboardingSetRoleResponse,
  OnboardingStatusResponse,
  IdentityType,
  HandleCheckResponse,
  ProfessionalKycPayload,
  ClientKycPayload,
  KycItemKey,
  KycItemKind,
  KycValidationRule,
  KycItemSpec,
  KycResubmission,
  KycSpecResponse,
  KycBankValue,
  KycIdentityValue,
  KycSelfieValue,
  KycRateValue,
} from './onboarding/types.js';
export type {
  MeResponse,
  BankAccount,
  Bank,
  Rate,
  NotificationPreferences,
  BookingBlock,
  BookingBlocksResponse,
} from './profile/types.js';
export { useMe } from './hooks/use-me.js';
export { useCategories } from './hooks/use-categories.js';
export { usePublicConfig } from './hooks/use-public-config.js';
export type {
  ProfessionalListItem,
  ProfessionalDetail,
  Category,
  HomeResponse,
  ProfessionalsPage,
  ApiRate,
  Review,
  ReviewsPage,
  AvailabilityDay,
  AvailabilityResponse,
} from './discovery/types.js';
export type {
  Booking,
  BookingsPage,
  BookingStatus,
  CallRecord,
  CallsPage,
  CallStatus,
  CallHistoryItem,
  CallHistoryPage,
  FeeMode,
  JoinCallResponse,
  JoinableCall,
} from './calls/types.js';
export type {
  WalletBalance,
  WalletStats,
  WalletTransaction,
  TransactionsPage,
  FundInitResponse,
  FundVerifyResponse,
  WithdrawalResponse,
  TransactionType as WalletTransactionType,
} from './wallet/types.js';
export type { ContentBlock, LegalDocument, Faq, HelpContact, PublicConfig } from './misc/types.js';

// Admin surface — endpoints, client, session, and all admin response types.
// Exported under explicit names so customer-side imports never accidentally
// pick up admin types.
export * from './admin/index.js';

// File-service helpers — shared between admin-web and customer-web. Talks
// directly to the Go file service (mint upload URI, get view URI). Use
// `useFilePreview(key)` to render any stored file by its key.
export * from './files/index.js';

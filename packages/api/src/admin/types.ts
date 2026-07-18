/**
 * Admin-side response shapes.
 *
 * Every shape here is grounded in the actual backend service that produces
 * it (apps/backend/src/features/admin/*.service.ts and feature-mounted
 * admin services). DO NOT speculate field names — grep the backend's
 * `toView` / `ServiceSuccess({ ... })` block first.
 *
 * Convention: enum-shaped constants are POJOs with a sibling type.
 */

// ─────────────────────────────────────────────────────── Auth ─────────────────

export const AdminRole = {
  ADMIN: 'admin',
  SUPPORT: 'support',
  FINANCE_OPS: 'finance_ops',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  totp_enabled: boolean;
}

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  totp_required: boolean;
  admin: AdminUser;
}

export interface AdminTotpSetupResponse {
  secret: string;
  otpauth_url: string;
  // Backend sends `qr_data_url` (admin-auth.service.ts:212); the old
  // `qr_code_data_url` name left the <img> src undefined so the QR never
  // rendered. (BUGS.md B3.)
  qr_data_url: string;
}

// ────────────────────────────────────────────────── Pagination ───────────────

export interface CursorMeta {
  next_cursor: string | null;
  has_more?: boolean;
}

export interface CursorPage<T> {
  items: T[];
  meta: CursorMeta;
}

// ───────────────────────────────────────────────── Users ─────────────────────
// Source: apps/backend/src/features/admin/admin.users.service.ts → toView + getUser

export const AdminUserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
} as const;
export type AdminUserStatus = (typeof AdminUserStatus)[keyof typeof AdminUserStatus];

export const AdminUserRole = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
} as const;
export type AdminUserRole = (typeof AdminUserRole)[keyof typeof AdminUserRole];

// admin.write.schema.ts list filter:
//   z.enum(['none', 'pending', 'approved', 'rejected'])
export const AdminKycStatus = {
  NONE: 'none',
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type AdminKycStatus = (typeof AdminKycStatus)[keyof typeof AdminKycStatus];

export interface AdminUserListItem {
  id: string;
  role: AdminUserRole | string | null;
  status: AdminUserStatus | string;
  email: string;
  email_verified_at: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  occupation: string | null;
  description: string | null;
  kyc_status: AdminKycStatus | string;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  kyc_reject_reason: string | null;
  last_seen_at: string | null;
  suspended_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserKycInline {
  id: string;
  identity_type: string;
  identity_number: string;
  document_upload_id: string | null;
  selfie_upload_key: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason_code: string | null;
  reject_note: string | null;
  /** Per-item resubmission set; empty = whole-submission rejection. */
  reject_item_keys: string[];
  created_at: string;
}

export interface AdminUserBankAccount {
  bank_code: string;
  bank_name: string;
  account_number_last4: string;
  account_name: string;
  added_at: string;
}

export interface AdminUserRecentCall {
  id: string;
  status: string;
  callee_user_id?: string;
  caller_user_id?: string;
  start_at: string;
  connected_seconds: number;
  ended_at: string | null;
}

export interface AdminUserRecentTxn {
  journal_id: string;
  kind: string;
  signed_amount_kobo: number | string;
  memo: string | null;
  created_at: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  kyc_submission: AdminUserKycInline | null;
  bank_account: AdminUserBankAccount | null;
  wallet: {
    currency: 'NGN';
    available_kobo: number | string;
    pending_kobo: number | string;
  };
  recent_calls_as_caller: AdminUserRecentCall[];
  recent_calls_as_callee: AdminUserRecentCall[];
  recent_transactions: AdminUserRecentTxn[];
  flags: {
    active_reports_against: number;
    failed_payouts_30d: number;
  };
}

// ───────────────────────────────────────────────── KYC ───────────────────────
// Source: admin.kyc.service.ts → toView. Status from schema:
//   z.enum(['none', 'pending_review', 'approved', 'rejected'])

export const AdminKycSubmissionStatus = {
  NONE: 'none',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type AdminKycSubmissionStatus =
  (typeof AdminKycSubmissionStatus)[keyof typeof AdminKycSubmissionStatus];

export interface AdminKycSubmission {
  id: string;
  user_id: string;
  identity_type: string;
  identity_number: string;
  document_upload_id: string | null;
  selfie_upload_key: string | null;
  status: AdminKycSubmissionStatus | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason_code: string | null;
  reject_note: string | null;
  /** Per-item resubmission set; empty = whole-submission rejection. */
  reject_item_keys: string[];
  created_at: string;
}

// ─────────────────────────────────────── Calls + bookings ────────────────────
// Source: admin.calls.service.ts → adminListCalls / adminListBookings / adminGetCallDetail

export const AdminCallStatus = {
  SCHEDULED: 'scheduled',
  WAITING_FOR_PARTIES: 'waiting_for_parties',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  TIMEOUT: 'timeout',
} as const;
export type AdminCallStatus = (typeof AdminCallStatus)[keyof typeof AdminCallStatus];

export const AdminCallType = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;
export type AdminCallType = (typeof AdminCallType)[keyof typeof AdminCallType];

export interface AdminCallListItem {
  id: string;
  booking_id: string;
  status: AdminCallStatus | string;
  agora_channel_name: string;
  connected_seconds: number;
  caller_user_id: string;
  callee_user_id: string;
  created_at: string;
  ended_at: string | null;
}

export interface AdminCallDetailBooking {
  id: string;
  status: string;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: AdminCallType | string;
  start_at: string;
  duration_minutes: number;
  total_paid_kobo: number | string;
  payee_amount_kobo: number | string;
  platform_fee_kobo: number | string;
  fee_mode_used: string;
  created_at: string;
}

export interface AdminCallDetail {
  id: string;
  booking_id: string;
  status: AdminCallStatus | string;
  agora_channel_name: string;
  connected_seconds: number;
  caller_joined_at: string | null;
  callee_joined_at: string | null;
  caller_left_at: string | null;
  callee_left_at: string | null;
  ended_at: string | null;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  created_at: string;
  booking?: AdminCallDetailBooking;
  [extra: string]: unknown;
}

export const AdminBookingStatus = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  PENDING: 'pending',
} as const;
export type AdminBookingStatus = (typeof AdminBookingStatus)[keyof typeof AdminBookingStatus];

export interface AdminBooking {
  id: string;
  status: AdminBookingStatus | string;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: AdminCallType | string;
  start_at: string;
  duration_minutes: number;
  total_paid_kobo: number | string;
  fee_mode_used: string;
  created_at: string;
}

// ───────────────────────────────────────────── Wallet / ledger ───────────────
// Source: admin.service.ts → toAccountView / toJournalSummary / getUserWallet

export const AdminAccountKind = {
  USER: 'user',
  SYSTEM: 'system',
  LIABILITY: 'liability',
} as const;
export type AdminAccountKind = (typeof AdminAccountKind)[keyof typeof AdminAccountKind];

export interface AdminAccountView {
  id: string;
  kind: AdminAccountKind | string;
  owner_user_id: string | null;
  system_code: string | null;
  currency: string;
  label: string | null;
  balance_kobo: number | string;
  is_active: boolean;
}

export interface AdminJournalSummary {
  id: string;
  kind: string;
  idempotency_key: string;
  related_call_id: string | null;
  related_payment_id: string | null;
  related_withdrawal_id: string | null;
  related_user_id: string | null;
  memo: string | null;
  created_by_admin_id: string | null;
  created_at: string;
}

export interface AdminUserWalletView {
  user_id: string;
  account_id: string;
  available_kobo: number | string;
  pending_kobo: number | string;
  currency: string;
  recent_journals: AdminJournalSummary[];
}

export interface AdminAccountSummaryView {
  account_id: string;
  total_kobo: number | string;
  currency: string;
  from: string | null;
  to: string | null;
}

export interface AdminPaystackWebhookSummary {
  id: string;
  event_id: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
  replay_count: number;
}

// ──────────────────────────────────────────────── Refunds ────────────────────
// Source: refunds.service.ts → toView

export const AdminRefundStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  AUTO_APPROVED: 'auto_approved',
  REJECTED: 'rejected',
} as const;
export type AdminRefundStatus = (typeof AdminRefundStatus)[keyof typeof AdminRefundStatus];

export interface AdminRefundRequest {
  id: string;
  status: AdminRefundStatus | string;
  target_journal_id: string;
  related_call_id: string | null;
  reason_code: string;
  description: string | null;
  requested_amount_kobo: number | string;
  refund_journal_id: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// ────────────────────────────────────────────── Withdrawals ──────────────────
// Source: admin.write.service.ts → listWithdrawalsAdmin
// Status: z.enum(['pending','processing','completed','failed','reversed'])

export const AdminWithdrawalStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVERSED: 'reversed',
} as const;
export type AdminWithdrawalStatus =
  (typeof AdminWithdrawalStatus)[keyof typeof AdminWithdrawalStatus];

export interface AdminWithdrawalBankSnapshot {
  bank_code?: string;
  bank_name?: string;
  account_number?: string;
  account_number_last4?: string;
  account_name?: string;
  [extra: string]: unknown;
}

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  status: AdminWithdrawalStatus | string;
  amount_kobo: number | string;
  currency: string;
  bank_snapshot: AdminWithdrawalBankSnapshot | null;
  failure_reason: string | null;
  paystack_transfer_code: string | null;
  requested_at: string;
  processed_at: string | null;
}

// ──────────────────────────────────────────── Transactions ───────────────────
// Source: admin.payments.service.ts → listTransactions + getTransactionDetail

export const AdminTransactionSource = {
  PAYMENT: 'payment',
  JOURNAL: 'journal',
} as const;
export type AdminTransactionSource =
  (typeof AdminTransactionSource)[keyof typeof AdminTransactionSource];

export interface AdminTransactionListItem {
  id: string;
  source: AdminTransactionSource | string;
  type: string | null;
  status: string;
  user_id: string | null;
  call_id: string | null;
  reference: string | null;
  paystack_reference: string | null;
  amount_kobo: number | string;
  signed_amount_kobo: number | string | null;
  currency: string;
  created_at: string;
}

export interface AdminTransactionPaymentDetail {
  source: 'payment';
  payment: {
    id: string;
    user_id: string;
    purpose: string;
    status: string;
    amount_kobo: number | string;
    paystack_fees_kobo: number | string | null;
    currency: string;
    reference: string | null;
    paystack_reference: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    [extra: string]: unknown;
  };
  related_webhooks: Array<{
    id: string;
    event_id: string;
    event_type: string;
    received_at: string;
    processed_at: string | null;
    processing_error: string | null;
  }>;
}

export interface AdminTransactionJournalDetail {
  source: 'journal';
  journal: AdminJournalSummary & { [extra: string]: unknown };
  lines: Array<{
    id: string;
    account_id: string;
    account_kind: string;
    account_label: string | null;
    signed_amount_kobo: number | string;
    currency: string;
  }>;
}

export type AdminTransactionDetail = AdminTransactionPaymentDetail | AdminTransactionJournalDetail;

// ────────────────────────────────────────────── Reports ──────────────────────
// Source: admin.reports.service.ts → toView. Status: z.enum(['pending','resolved','dismissed'])

export const AdminReportStatus = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;
export type AdminReportStatus = (typeof AdminReportStatus)[keyof typeof AdminReportStatus];

export interface AdminReport {
  id: string;
  reporter_user_id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  description: string | null;
  status: AdminReportStatus | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

// ───────────────────────────────────────────── Content ───────────────────────

export const BannerAudience = {
  ALL: 'all',
  CLIENTS: 'clients',
  PROFESSIONALS: 'professionals',
} as const;
export type BannerAudience = (typeof BannerAudience)[keyof typeof BannerAudience];

export interface AdminBanner {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  body_blocks: unknown;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  deeplink: string | null;
  audience: BannerAudience | string;
  placement: string;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminLegalKind = {
  EULA: 'eula',
  PRIVACY: 'privacy',
  TERMS: 'terms',
} as const;
export type AdminLegalKind = (typeof AdminLegalKind)[keyof typeof AdminLegalKind];

export interface AdminLegalDocument {
  id: string;
  kind: AdminLegalKind | string;
  version: number | string;
  content_markdown: string | null;
  blocks: unknown;
  created_at: string;
  [extra: string]: unknown;
}

export interface AdminLegalListResponse {
  kind: string;
  items: AdminLegalDocument[];
}

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  blocks: unknown;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────── Foundations ─────────────────────

export interface AdminAuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminConfigItem {
  key: string;
  value: unknown;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

// ─────────────────────────────────────────────── Metrics ─────────────────────

export interface AdminMetricsOverview {
  users: {
    total: number;
    active: number;
    suspended: number;
    blocked: number;
    by_role: { professionals: number; clients: number };
  };
  calls: {
    in_progress: number;
    scheduled: number;
    completed_30d: number;
    completed_today: number;
  };
  queues: {
    pending_kyc: number;
    pending_refunds: number;
    pending_withdrawals: number;
  };
  generated_at: string;
}

export const RevenueGranularity = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;
export type RevenueGranularity = (typeof RevenueGranularity)[keyof typeof RevenueGranularity];

export interface AdminMetricsRevenuePoint {
  bucket_start: string;
  total_volume_kobo: number | string;
  total_fee_kobo: number | string;
  settlement_count: number;
}

export interface AdminMetricsRevenue {
  from: string;
  to: string;
  granularity: RevenueGranularity;
  series: AdminMetricsRevenuePoint[];
  generated_at: string;
}

export interface AdminCohortWeeklyRow {
  week_start: string;
  role: string;
  signups: number;
}

export interface AdminMetricsCohorts {
  weekly_signups: AdminCohortWeeklyRow[];
  generated_at: string;
}

// ────────────────────────── Reviews + strikes ────────────────────────────────
// Sources:
//   apps/backend/src/features/reviews/reviews.service.ts → adminListReviews / adminGetReview
//   apps/backend/src/features/strikes/strikes.service.ts → adminListStrikes / adminGetStrike

export interface AdminReviewView {
  id: string;
  call_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback_text: string | null;
  is_public: boolean;
  reviewer: { id: string; name: string | null; avatar_url: string | null };
  subject: { id: string; name: string | null; avatar_url: string | null };
  hidden_at: string | null;
  hidden_by_admin_id: string | null;
  hide_reason: string | null;
  created_at: string;
}

export interface AdminAuditTrailEntry {
  id: string;
  action: string;
  admin_id: string | null;
  admin_email: string | null;
  note: string | null;
  created_at: string;
}

export interface AdminReviewDetailView extends AdminReviewView {
  call: {
    id: string;
    call_type: AdminCallType | string;
    duration_minutes: number;
    connected_seconds: number;
    scheduled_at: string;
    status: string;
  } | null;
  audit_trail: AdminAuditTrailEntry[];
}

export const StrikeStatus = {
  ACTIVE: 'active',
  DISPUTED: 'disputed',
  UPHELD: 'upheld',
  VOIDED: 'voided',
} as const;
export type StrikeStatus = (typeof StrikeStatus)[keyof typeof StrikeStatus];

export const StrikeSubjectRole = {
  PROFESSIONAL: 'professional',
  CALLER: 'caller',
} as const;
export type StrikeSubjectRole = (typeof StrikeSubjectRole)[keyof typeof StrikeSubjectRole];

export const StrikeReasonCode = {
  NO_SHOW: 'no_show',
  LATE_CANCEL: 'late_cancel',
  MID_CALL_QUIT: 'mid_call_quit',
  CALLER_NO_SHOW: 'caller_no_show',
  CALLER_DISCONNECT: 'caller_disconnect',
} as const;
export type StrikeReasonCode = (typeof StrikeReasonCode)[keyof typeof StrikeReasonCode];

export interface AdminStrikeView {
  id: string;
  subject: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    role: StrikeSubjectRole;
  };
  related_call_id: string | null;
  related_booking_id: string | null;
  reason_code: StrikeReasonCode;
  description: string | null;
  status: StrikeStatus;
  dispute_comment: string | null;
  disputed_at: string | null;
  admin_review_comment: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminStrikeDetailView extends AdminStrikeView {
  related_call: {
    id: string;
    call_type: AdminCallType | string;
    scheduled_at: string;
    status: string;
    connected_seconds: number;
  } | null;
  related_booking: {
    id: string;
    status: string;
    created_at: string;
  } | null;
  subject_strike_history: {
    total_count: number;
    active_count: number;
    upheld_count: number;
    voided_count: number;
    strikes_before_ban: number;
  };
  audit_trail: AdminAuditTrailEntry[];
}

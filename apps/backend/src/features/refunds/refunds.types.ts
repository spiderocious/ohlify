import type { JsonKobo } from '@features/wallet/wallet.types.js';

export const RefundRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  AUTO_APPROVED: 'auto_approved',
  REJECTED: 'rejected',
} as const;

export type RefundRequestStatus = (typeof RefundRequestStatus)[keyof typeof RefundRequestStatus];

export interface RefundRequestRow {
  id: string;
  requester_user_id: string;
  target_journal_id: string;
  related_call_id: string | null;
  reason_code: string;
  description: string | null;
  requested_amount_kobo: string;
  status: RefundRequestStatus;
  refund_journal_id: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: Date | null;
  review_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RefundRequestView {
  id: string;
  status: RefundRequestStatus;
  target_journal_id: string;
  related_call_id: string | null;
  reason_code: string;
  description: string | null;
  requested_amount_kobo: JsonKobo;
  refund_journal_id: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

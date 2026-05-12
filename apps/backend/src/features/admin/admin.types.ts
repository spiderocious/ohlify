import type { JsonKobo } from '@features/wallet/wallet.types.js';

export interface AdminAccountView {
  id: string;
  kind: 'user' | 'system' | 'liability';
  owner_user_id: string | null;
  system_code: string | null;
  currency: string;
  label: string;
  balance_kobo: JsonKobo;
  is_active: boolean;
}

export interface AdminUserWalletView {
  user_id: string;
  account_id: string;
  available_kobo: JsonKobo;
  pending_kobo: JsonKobo;
  withdrawable_kobo: JsonKobo;
  currency: string;
  recent_journals: AdminJournalSummary[];
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

export interface AdminJournalDetail extends AdminJournalSummary {
  lines: AdminJournalLine[];
}

export interface AdminJournalLine {
  id: string;
  account_id: string;
  account_label: string;
  signed_amount_kobo: JsonKobo;
  currency: string;
}

export interface AdminReconciliationDriftRow {
  account_id: string;
  account_label: string;
  cached_balance_kobo: JsonKobo;
  ledger_sum_kobo: JsonKobo;
  drift_kobo: JsonKobo;
}

export interface AdminReconciliationReport {
  ran_at: string;
  ok: boolean;
  drift: AdminReconciliationDriftRow[];
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

export interface AdminAccountSummaryView {
  account_id: string;
  total_kobo: JsonKobo;
  currency: string;
  from: string | null;
  to: string | null;
}

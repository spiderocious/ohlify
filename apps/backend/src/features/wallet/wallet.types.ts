export interface WalletSummaryView {
  balance_kobo: number;
  pending_balance_kobo: number;
  withdrawable_balance_kobo: number;
  currency: string;
}

export interface WalletStatsView {
  this_week_kobo: number;
  this_month_kobo: number;
  total_calls: number;
}

export interface WalletTransactionView {
  id: string;
  journal_id: string;
  reference: string | null;
  type: string;
  amount_kobo: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  occurred_at: string;
  description: string;
  related_call_id: string | null;
  related_payment_id: string | null;
  related_withdrawal_id: string | null;
}

export interface FundingInitView {
  reference: string;
  paystack_reference: string | null;
  amount_kobo: number;
  currency: string;
  authorization_url: string;
  access_code: string;
}

export interface FundingVerifyView {
  status: 'success' | 'pending' | 'failed';
  amount_kobo: number;
  currency: string;
  reference: string;
}

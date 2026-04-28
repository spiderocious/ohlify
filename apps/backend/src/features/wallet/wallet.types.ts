// Money fields are JSON `number` when within IEEE-754 safe range (< 2^53),
// JSON `string` above. Clients must accept both. Production paths can't hit
// the string branch with current limits (max wallet config = ₦1M = 100M kobo
// = 10^8, well below 2^53), but the contract holds for safety.
export type JsonKobo = number | string;

export interface WalletSummaryView {
  balance_kobo: JsonKobo;
  pending_balance_kobo: JsonKobo;
  withdrawable_balance_kobo: JsonKobo;
  currency: string;
}

export interface WalletStatsView {
  this_week_kobo: JsonKobo;
  this_month_kobo: JsonKobo;
  total_calls: number;
}

export interface WalletTransactionView {
  id: string;
  journal_id: string;
  reference: string | null;
  type: string;
  amount_kobo: JsonKobo;
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
  amount_kobo: JsonKobo;
  currency: string;
  authorization_url: string;
  access_code: string;
}

export interface FundingVerifyView {
  status: 'success' | 'pending' | 'failed';
  amount_kobo: JsonKobo;
  currency: string;
  reference: string;
}

export interface WithdrawalView {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  amount_kobo: JsonKobo;
  currency: string;
  bank_name: string;
  account_number_masked: string;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
}

export interface PayResponseView {
  status: 'paid';
  journal_id: string;
  amount_kobo: JsonKobo;
  currency: string;
  purpose: string;
  metadata: Record<string, unknown>;
  paid_at: string;
}

export interface InsufficientBalanceView {
  status: 'insufficient_balance';
  short_by_kobo: JsonKobo;
  current_balance_kobo: JsonKobo;
  suggested_funding_amount_kobo: JsonKobo;
  currency: string;
}

export interface WalletBalance {
  balance_kobo: number;
  pending_balance_kobo: number;
  withdrawable_balance_kobo: number;
  currency: string;
}

export interface WalletStats {
  this_week_kobo: number;
  this_month_kobo: number;
  total_calls: number;
}

export type TransactionType =
  | 'wallet_funding'
  | 'call_payment'
  | 'call_earning'
  | 'call_refund'
  | 'withdrawal'
  | 'withdrawal_completed'
  | 'withdrawal_reversed'
  | 'admin_credit'
  | 'admin_debit'
  | 'admin_manual'
  | 'promo_credit';

export interface WalletTransaction {
  id: string;
  journal_id: string;
  reference: string;
  type: TransactionType;
  amount_kobo: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  occurred_at: string;
  description: string;
  related_call_id: string | null;
  related_payment_id: string | null;
  related_withdrawal_id: string | null;
}

export interface TransactionsPage {
  data: WalletTransaction[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface FundInitResponse {
  reference: string;
  paystack_reference: string;
  amount_kobo: number;
  currency: string;
  authorization_url: string;
  access_code: string;
}

export interface WithdrawalResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  amount_kobo: number;
  currency: string;
  bank_name: string;
  account_number_masked: string;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
}

export interface FundVerifyResponse {
  reference: string;
  status: 'success' | 'pending' | 'failed';
  amount_kobo: number;
  currency: string;
}

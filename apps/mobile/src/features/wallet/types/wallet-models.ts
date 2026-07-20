import type { CursorPage } from '@features/calls/types/call-models';

/**
 * Wallet DTOs. Backend stores money as integer kobo; formatting only
 * happens at render time via formatKobo(). Mirrors
 * mobile/lib/features/wallet/types/wallet_models.dart.
 */
export interface WalletBalance {
  balanceKobo: number;
  pendingBalanceKobo: number;
  withdrawableBalanceKobo: number;
  currency: string;
}

export function walletBalanceFromJson(json: Record<string, unknown>): WalletBalance {
  return {
    balanceKobo: typeof json.balance_kobo === 'number' ? json.balance_kobo : 0,
    pendingBalanceKobo: typeof json.pending_balance_kobo === 'number' ? json.pending_balance_kobo : 0,
    withdrawableBalanceKobo: typeof json.withdrawable_balance_kobo === 'number' ? json.withdrawable_balance_kobo : 0,
    currency: (json.currency as string) ?? 'NGN',
  };
}

export interface WalletStats {
  thisWeekKobo: number;
  thisMonthKobo: number;
  totalCalls: number;
}

export function walletStatsFromJson(json: Record<string, unknown>): WalletStats {
  return {
    thisWeekKobo: typeof json.this_week_kobo === 'number' ? json.this_week_kobo : 0,
    thisMonthKobo: typeof json.this_month_kobo === 'number' ? json.this_month_kobo : 0,
    totalCalls: typeof json.total_calls === 'number' ? json.total_calls : 0,
  };
}

/**
 * Backend-shaped wallet transaction. `title`, `icon`, and `direction` are
 * shipped by the server (see api-docs/slice-a-wallet-engine-apis.md §11) and
 * rendered as-is. No client-side kind→label mapper — the server owns the
 * vocabulary, the client trusts it.
 */
export type WalletTxDirection = 'credit' | 'debit';

export interface WalletTransaction {
  id: string;
  type: string;
  amountKobo: number;
  /** `completed | pending | failed | reversed`. Older callers may send `success`. */
  status: string;
  createdAt: string;
  /** Long-form label (receipts, detail sheets). */
  description: string;
  /** Short label for list rows. */
  title: string;
  /**
   * Server-shipped icon key. See backend `WALLET_TX_ICONS` and the
   * corresponding entries in `@ohlify/mobile-ui`'s `AppIconNames`.
   */
  icon: string;
  direction: WalletTxDirection;
  reference?: string;
}

export function walletTransactionFromJson(json: Record<string, unknown>): WalletTransaction {
  const direction =
    (json.direction as WalletTxDirection | undefined) ??
    // Legacy fallback for old backend responses that predate the direction
    // field. Positive amount ⇒ credit, negative ⇒ debit.
    (typeof json.amount_kobo === 'number' && json.amount_kobo > 0 ? 'credit' : 'debit');
  const desc = (json.description as string | undefined) ?? '';
  return {
    id: json.id as string,
    type: (json.type as string) ?? 'unknown',
    amountKobo: typeof json.amount_kobo === 'number' ? json.amount_kobo : 0,
    status: (json.status as string) ?? 'completed',
    createdAt: ((json.occurred_at ?? json.created_at) as string) ?? new Date().toISOString(),
    description: desc,
    title: (json.title as string | undefined) ?? desc,
    icon: (json.icon as string | undefined) ?? 'admin_shield',
    direction,
    reference: json.reference as string | undefined,
  };
}

export function walletTransactionIsSuccess(t: WalletTransaction): boolean {
  return t.status === 'completed' || t.status === 'success';
}

export function walletTransactionIsCredit(t: WalletTransaction): boolean {
  return t.direction === 'credit';
}

export interface FundInitResponse {
  reference: string;
  amountKobo: number;
  authorizationUrl: string;
  accessCode: string;
  currency: string;
}

export function fundInitResponseFromJson(json: Record<string, unknown>): FundInitResponse {
  return {
    reference: json.reference as string,
    amountKobo: typeof json.amount_kobo === 'number' ? json.amount_kobo : 0,
    authorizationUrl: (json.authorization_url as string) ?? '',
    accessCode: (json.access_code as string) ?? '',
    currency: (json.currency as string) ?? 'NGN',
  };
}

export interface FundVerifyResponse {
  /** success | pending | failed */
  status: string;
  amountKobo: number;
  currency: string;
}

export function fundVerifyResponseFromJson(json: Record<string, unknown>): FundVerifyResponse {
  return {
    status: (json.status as string) ?? 'pending',
    amountKobo: typeof json.amount_kobo === 'number' ? json.amount_kobo : 0,
    currency: (json.currency as string) ?? 'NGN',
  };
}

export interface WithdrawalResponse {
  id: string;
  status: string;
  amountKobo: number;
  requestedAt: string;
  bankName?: string;
  accountNumberMasked?: string;
  failureReason?: string;
  processedAt?: string;
  currency: string;
}

export function withdrawalResponseFromJson(json: Record<string, unknown>): WithdrawalResponse {
  return {
    id: json.id as string,
    status: (json.status as string) ?? 'pending',
    amountKobo: typeof json.amount_kobo === 'number' ? json.amount_kobo : 0,
    requestedAt: (json.requested_at as string) ?? new Date().toISOString(),
    bankName: json.bank_name as string | undefined,
    accountNumberMasked: json.account_number_masked as string | undefined,
    failureReason: json.failure_reason as string | undefined,
    processedAt: typeof json.processed_at === 'string' ? json.processed_at : undefined,
    currency: (json.currency as string) ?? 'NGN',
  };
}

/** Format kobo as Nigerian-Naira display string. Mirrors formatKobo() in the Dart source. */
export function formatKobo(kobo: number, currency = 'NGN'): string {
  const naira = kobo / 100;
  const whole = Math.trunc(naira);
  const fraction = Math.abs(naira - whole);
  const wholeStr = Math.abs(whole).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  const symbol = currency === 'NGN' ? '₦' : `${currency} `;
  const sign = whole < 0 ? '-' : '';
  if (fraction === 0) return `${sign}${symbol}${wholeStr}`;
  const cents = String(Math.round(fraction * 100)).padStart(2, '0');
  return `${sign}${symbol}${wholeStr}.${cents}`;
}

export type { CursorPage };

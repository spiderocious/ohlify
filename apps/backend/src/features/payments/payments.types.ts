export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentPurpose = {
  WALLET_FUNDING: 'wallet_funding',
  CALL_PAYMENT: 'call_payment',
} as const;

export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose];

export interface PaymentRow {
  id: string;
  reference: string;
  paystack_reference: string | null;
  purpose: PaymentPurpose;
  user_id: string;
  call_id: string | null;
  amount_kobo: string;
  currency: string;
  status: PaymentStatus;
  authorization_url: string | null;
  access_code: string | null;
  channel: string | null;
  paid_at: Date | null;
  failed_reason: string | null;
  paystack_fees_kobo: string | null;
  raw_paystack_payload: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentView {
  id: string;
  reference: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount_kobo: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  call_id: string | null;
  created_at: string;
}

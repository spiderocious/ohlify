import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import type { PaymentPurpose, PaymentRow, PaymentStatus } from './payments.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreatePaymentInput {
  userId: string;
  purpose: PaymentPurpose;
  amountKobo: number;
  reference: string;
  callId?: string | null;
  authorizationUrl?: string;
  accessCode?: string;
}

export const createPending = async (input: CreatePaymentInput): Promise<PaymentRow> => {
  const res = await pool.query<PaymentRow>(
    `INSERT INTO payments (
       id, reference, purpose, user_id, call_id, amount_kobo,
       authorization_url, access_code, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      id('pay'),
      input.reference,
      input.purpose,
      input.userId,
      input.callId ?? null,
      input.amountKobo,
      input.authorizationUrl ?? null,
      input.accessCode ?? null,
    ],
  );
  return res.rows[0]!;
};

export const findByReference = async (reference: string): Promise<PaymentRow | null> => {
  const res = await pool.query<PaymentRow>(`SELECT * FROM payments WHERE reference = $1 LIMIT 1`, [
    reference,
  ]);
  return res.rows[0] ?? null;
};

export const findByReferenceForUpdate = async (
  runner: QueryRunner,
  reference: string,
): Promise<PaymentRow | null> => {
  const res = await runner.query<PaymentRow>(
    `SELECT * FROM payments WHERE reference = $1 LIMIT 1 FOR UPDATE`,
    [reference],
  );
  return res.rows[0] ?? null;
};

export const findByPaystackReference = async (paystackRef: string): Promise<PaymentRow | null> => {
  const res = await pool.query<PaymentRow>(
    `SELECT * FROM payments WHERE paystack_reference = $1 LIMIT 1`,
    [paystackRef],
  );
  return res.rows[0] ?? null;
};

export interface MarkSuccessInput {
  paymentId: string;
  paystackReference: string;
  paidAt: Date;
  channel: string | null;
  feesKobo: number | null;
  rawPayload: unknown;
}

export const markSuccess = async (
  runner: QueryRunner,
  input: MarkSuccessInput,
): Promise<PaymentRow> => {
  const res = await runner.query<PaymentRow>(
    `UPDATE payments
        SET status               = 'success',
            paystack_reference   = $2,
            paid_at              = $3,
            channel              = $4,
            paystack_fees_kobo   = $5,
            raw_paystack_payload = $6::jsonb,
            updated_at           = now()
      WHERE id = $1
      RETURNING *`,
    [
      input.paymentId,
      input.paystackReference,
      input.paidAt,
      input.channel,
      input.feesKobo,
      JSON.stringify(input.rawPayload),
    ],
  );
  return res.rows[0]!;
};

export const markFailed = async (
  runner: QueryRunner,
  paymentId: string,
  reason: string,
  rawPayload: unknown,
): Promise<PaymentRow> => {
  const res = await runner.query<PaymentRow>(
    `UPDATE payments
        SET status               = 'failed',
            failed_reason        = $2,
            raw_paystack_payload = $3::jsonb,
            updated_at           = now()
      WHERE id = $1
      RETURNING *`,
    [paymentId, reason, JSON.stringify(rawPayload)],
  );
  return res.rows[0]!;
};

export const updateStatus = async (
  runner: QueryRunner,
  paymentId: string,
  status: PaymentStatus,
): Promise<void> => {
  await runner.query(`UPDATE payments SET status = $2, updated_at = now() WHERE id = $1`, [
    paymentId,
    status,
  ]);
};

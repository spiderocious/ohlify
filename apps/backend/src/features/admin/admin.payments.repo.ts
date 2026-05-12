import { pool } from '@lib/db/pool.js';

// Joined payment + journal view for the admin transactions list. We
// surface BOTH paystack-tracked payments (funding / call-payment-via-
// paystack) AND wallet-internal journals (admin credit/debit, refunds,
// settlements, withdrawals) under one roof. Status / type / refs are
// projected to a uniform shape so the admin UI doesn't need to branch
// per kind.

export type AdminTxnSource = 'payment' | 'journal';

export interface AdminTransactionRow {
  // Synthetic id — `payment_id` if source='payment', else `journal_id`.
  id: string;
  source: AdminTxnSource;
  // Free-text label tied to the payment kind / journal kind.
  type: string;
  status: string | null;
  user_id: string | null;
  call_id: string | null;
  reference: string | null;
  paystack_reference: string | null;
  amount_kobo: string;
  // For wallet entries we store the raw signed amount — the UI can decide
  // whether to render with sign or not.
  signed_amount_kobo: string | null;
  currency: string;
  created_at: Date;
}

export interface ListAdminTxnsQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  source?: AdminTxnSource | undefined;
  status?: string | undefined;
  user_id?: string | undefined;
  reference?: string | undefined; // matches payments.reference OR paystack_reference, OR journals.id
  from?: Date | undefined;
  to?: Date | undefined;
}

export const listTransactions = async (q: ListAdminTxnsQuery): Promise<AdminTransactionRow[]> => {
  // Two CTEs unioned. Both projected to the AdminTransactionRow shape.
  // The `source` filter, when present, drops one CTE entirely.
  const params: unknown[] = [];
  const paymentFilters: string[] = [];
  const journalFilters: string[] = [];

  if (q.status) {
    params.push(q.status);
    // payments.status is an enum; journals don't have a "status" — treat
    // status filter as a payments-only filter.
    paymentFilters.push(`p.status = $${params.length}::payment_status`);
    journalFilters.push('FALSE');
  }
  if (q.user_id) {
    params.push(q.user_id);
    paymentFilters.push(`p.user_id = $${params.length}`);
    journalFilters.push(`j.related_user_id = $${params.length}`);
  }
  if (q.reference) {
    params.push(q.reference);
    paymentFilters.push(
      `(p.reference = $${params.length} OR p.paystack_reference = $${params.length})`,
    );
    journalFilters.push(`j.id = $${params.length}`);
  }
  if (q.from) {
    params.push(q.from);
    paymentFilters.push(`p.created_at >= $${params.length}`);
    journalFilters.push(`j.created_at >= $${params.length}`);
  }
  if (q.to) {
    params.push(q.to);
    paymentFilters.push(`p.created_at <= $${params.length}`);
    journalFilters.push(`j.created_at <= $${params.length}`);
  }

  const cursorClause = (() => {
    if (!q.cursor) return { paymentClause: 'TRUE', journalClause: 'TRUE' };
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    const sk = `$${params.length - 1}`;
    const lid = `$${params.length}`;
    return {
      paymentClause: `(p.created_at < ${sk}::timestamptz OR (p.created_at = ${sk}::timestamptz AND p.id < ${lid}))`,
      journalClause: `(j.created_at < ${sk}::timestamptz OR (j.created_at = ${sk}::timestamptz AND j.id < ${lid}))`,
    };
  })();

  const paymentWhere = [...paymentFilters, cursorClause.paymentClause]
    .filter((x) => x !== 'TRUE')
    .join(' AND ');
  const journalWhere = [...journalFilters, cursorClause.journalClause]
    .filter((x) => x !== 'TRUE')
    .join(' AND ');

  const includePayments = q.source === undefined || q.source === 'payment';
  const includeJournals = q.source === undefined || q.source === 'journal';

  // Push the limit AFTER all other params so the SQL references it last.
  params.push(q.limit + 1);
  const limitParamIdx = params.length;

  const paymentWhereSql = paymentWhere ? `WHERE ${paymentWhere}` : '';
  const journalWhereSql = journalWhere ? `WHERE ${journalWhere}` : '';

  const paymentsCte = includePayments
    ? `SELECT p.id::text AS id,
              'payment'::text AS source,
              p.purpose::text AS type,
              p.status::text AS status,
              p.user_id, p.call_id,
              p.reference, p.paystack_reference,
              p.amount_kobo::text AS amount_kobo,
              NULL::text AS signed_amount_kobo,
              p.currency,
              p.created_at
         FROM payments p
        ${paymentWhereSql}`
    : null;
  const journalsCte = includeJournals
    ? `SELECT j.id::text AS id,
              'journal'::text AS source,
              j.kind::text AS type,
              NULL::text AS status,
              j.related_user_id AS user_id,
              j.related_call_id AS call_id,
              NULL::text AS reference,
              NULL::text AS paystack_reference,
              -- Aggregate the absolute volume across the journal's lines
              -- (sum of positives = total flowing in any direction).
              COALESCE((
                SELECT SUM(we.signed_amount_kobo) FILTER (WHERE we.signed_amount_kobo > 0)
                  FROM wallet_entries we
                 WHERE we.journal_id = j.id
              ), 0)::text AS amount_kobo,
              -- For the user-row, also surface the user's signed delta.
              COALESCE((
                SELECT we.signed_amount_kobo
                  FROM wallet_entries we
                  JOIN accounts acct ON acct.id = we.account_id
                 WHERE we.journal_id = j.id
                   AND acct.kind = 'user'
                   AND acct.owner_user_id = j.related_user_id
                 LIMIT 1
              ), 0)::text AS signed_amount_kobo,
              'NGN'::text AS currency,
              j.created_at
         FROM journal_entries j
        ${journalWhereSql}`
    : null;

  const ctes = [paymentsCte, journalsCte].filter((x): x is string => x !== null);
  if (ctes.length === 0) return [];

  const sql = `
    WITH unioned AS (
      ${ctes.join('\n      UNION ALL\n      ')}
    )
    SELECT * FROM unioned
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitParamIdx}
  `;

  const res = await pool.query<AdminTransactionRow>(sql, params);
  return res.rows;
};

export interface AdminTxnDetailPayment {
  source: 'payment';
  payment: {
    id: string;
    reference: string;
    paystack_reference: string | null;
    purpose: string;
    user_id: string;
    call_id: string | null;
    amount_kobo: string;
    currency: string;
    status: string;
    paid_at: Date | null;
    failed_reason: string | null;
    paystack_fees_kobo: string | null;
    raw_paystack_payload: unknown;
    created_at: Date;
    updated_at: Date;
  };
  related_webhooks: Array<{
    id: string;
    event_id: string;
    event_type: string;
    received_at: Date;
    processed_at: Date | null;
    processing_error: string | null;
  }>;
}

export interface AdminTxnDetailJournal {
  source: 'journal';
  journal: {
    id: string;
    kind: string;
    idempotency_key: string;
    related_user_id: string | null;
    related_call_id: string | null;
    related_payment_id: string | null;
    related_withdrawal_id: string | null;
    memo: string | null;
    created_at: Date;
  };
  lines: Array<{
    id: string;
    account_id: string;
    account_kind: string;
    account_label: string;
    signed_amount_kobo: string;
    currency: string;
  }>;
}

export type AdminTxnDetail = AdminTxnDetailPayment | AdminTxnDetailJournal | null;

export const findTxnDetail = async (id: string): Promise<AdminTxnDetail> => {
  // Try payment first (id starts with 'pay_'); otherwise try journal.
  if (id.startsWith('pay_')) {
    const payment = await pool.query<AdminTxnDetailPayment['payment']>(
      `SELECT id, reference, paystack_reference,
              purpose::text AS purpose, user_id, call_id,
              amount_kobo::text, currency, status::text AS status,
              paid_at, failed_reason,
              paystack_fees_kobo::text, raw_paystack_payload,
              created_at, updated_at
         FROM payments WHERE id = $1`,
      [id],
    );
    if (payment.rowCount === 0) return null;
    const webhooks = await pool.query<{
      id: string;
      event_id: string;
      event_type: string;
      received_at: Date;
      processed_at: Date | null;
      processing_error: string | null;
    }>(
      // Match webhooks whose raw_body references this payment's reference.
      // Cheap-but-correct: scan the latest 200 webhooks of any matching type.
      `SELECT pwh.id, pwh.event_id, pwh.event_type, pwh.received_at,
              pwh.processed_at, pwh.processing_error
         FROM paystack_webhooks pwh
         WHERE pwh.raw_body::text LIKE '%' || $1 || '%'
         ORDER BY pwh.received_at DESC
         LIMIT 50`,
      [payment.rows[0]!.reference],
    );
    return { source: 'payment', payment: payment.rows[0]!, related_webhooks: webhooks.rows };
  }

  // Journal path.
  const journal = await pool.query<AdminTxnDetailJournal['journal']>(
    `SELECT id, kind::text AS kind, idempotency_key,
            related_user_id, related_call_id, related_payment_id, related_withdrawal_id,
            memo, created_at
       FROM journal_entries WHERE id = $1`,
    [id],
  );
  if (journal.rowCount === 0) return null;
  const lines = await pool.query<AdminTxnDetailJournal['lines'][number]>(
    `SELECT we.id, we.account_id,
            acct.kind::text AS account_kind,
            acct.label AS account_label,
            we.signed_amount_kobo::text,
            we.currency
       FROM wallet_entries we
       JOIN accounts acct ON acct.id = we.account_id
       WHERE we.journal_id = $1
       ORDER BY we.signed_amount_kobo DESC, we.id ASC`,
    [id],
  );
  return { source: 'journal', journal: journal.rows[0]!, lines: lines.rows };
};

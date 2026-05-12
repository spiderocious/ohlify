import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import type { FaqRow, TicketRow } from './support.types.js';

export const findPublishedFaqs = async (): Promise<FaqRow[]> => {
  const res = await pool.query<FaqRow>(
    `SELECT id, question, answer, blocks, sort_order, is_published, created_at, updated_at
       FROM faqs
      WHERE is_published = TRUE
      ORDER BY sort_order ASC, created_at ASC`,
  );
  return res.rows;
};

// Used for ETag computation on /help/faqs.
export const fingerprintFaqs = async (): Promise<string | null> => {
  const res = await pool.query<{ fp: string | null }>(
    `SELECT MD5(string_agg(id || ':' || EXTRACT(EPOCH FROM updated_at)::text, ',' ORDER BY sort_order, id)) AS fp
       FROM faqs
      WHERE is_published = TRUE`,
  );
  return res.rows[0]?.fp ?? null;
};

export const createTicket = async (input: {
  userId: string;
  subject: string;
  message: string;
  attachments: string[];
}): Promise<TicketRow> => {
  const res = await pool.query<TicketRow>(
    `INSERT INTO tickets (id, user_id, subject, message, attachments)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [id('tk'), input.userId, input.subject, input.message, JSON.stringify(input.attachments)],
  );
  return res.rows[0]!;
};

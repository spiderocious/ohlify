import { pool } from '@lib/db/pool.js';

import type { BankRow } from './banks.types.js';

export const findAllActive = async (): Promise<BankRow[]> => {
  const res = await pool.query<BankRow>(
    `SELECT code, name, logo_url, is_active, synced_at
       FROM banks
      WHERE is_active = TRUE
      ORDER BY name ASC`,
  );
  return res.rows;
};

export const findActiveByCode = async (code: string): Promise<BankRow | null> => {
  const res = await pool.query<BankRow>(
    `SELECT code, name, logo_url, is_active, synced_at
       FROM banks
      WHERE code = $1 AND is_active = TRUE
      LIMIT 1`,
    [code],
  );
  return res.rows[0] ?? null;
};

export const maxSyncedAt = async (): Promise<Date | null> => {
  const res = await pool.query<{ max: Date | null }>(`SELECT MAX(synced_at) AS max FROM banks`);
  return res.rows[0]?.max ?? null;
};

import { pool } from '@lib/db/pool.js';

import type { CategoryRow } from './categories.types.js';

export const findAllActive = async (): Promise<CategoryRow[]> => {
  const res = await pool.query<CategoryRow>(
    `SELECT value, label, icon_url, sort_order, is_active
       FROM professional_categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, value ASC`,
  );
  return res.rows;
};

// Used to compute ETag for /professional-categories — fingerprint changes when
// any active row is added, removed, relabeled, or re-ordered.
export const fingerprint = async (): Promise<string> => {
  const res = await pool.query<{ fp: string | null }>(
    `SELECT MD5(string_agg(value || ':' || label || ':' || sort_order::text, ',' ORDER BY sort_order, value)) AS fp
       FROM professional_categories
      WHERE is_active = TRUE`,
  );
  return res.rows[0]?.fp ?? 'empty';
};

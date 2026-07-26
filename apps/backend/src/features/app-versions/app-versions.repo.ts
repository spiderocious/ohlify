import { pool } from '@lib/db/pool.js';

import type { AppPlatform, AppVersionRow } from './app-versions.types.js';

export const findByPlatform = async (platform: AppPlatform): Promise<AppVersionRow | null> => {
  const res = await pool.query<AppVersionRow>(
    `SELECT * FROM app_versions WHERE platform = $1 LIMIT 1`,
    [platform],
  );
  return res.rows[0] ?? null;
};

export const listAll = async (): Promise<AppVersionRow[]> => {
  const res = await pool.query<AppVersionRow>(`SELECT * FROM app_versions ORDER BY platform ASC`);
  return res.rows;
};

export interface UpsertAppVersionInput {
  platform: AppPlatform;
  minVersion: string;
  forced: boolean;
  storeUrl: string;
  title: string;
  descriptionMd: string | null;
  illustrationKey: string | null;
  updatedBy: string | null;
}

export const upsert = async (input: UpsertAppVersionInput): Promise<AppVersionRow> => {
  const res = await pool.query<AppVersionRow>(
    `INSERT INTO app_versions
       (platform, min_version, forced, store_url, title, description_md, illustration_key, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (platform) DO UPDATE SET
       min_version      = EXCLUDED.min_version,
       forced           = EXCLUDED.forced,
       store_url        = EXCLUDED.store_url,
       title            = EXCLUDED.title,
       description_md   = EXCLUDED.description_md,
       illustration_key = EXCLUDED.illustration_key,
       updated_by       = EXCLUDED.updated_by,
       updated_at       = now()
     RETURNING *`,
    [
      input.platform,
      input.minVersion,
      input.forced,
      input.storeUrl,
      input.title,
      input.descriptionMd,
      input.illustrationKey,
      input.updatedBy,
    ],
  );
  return res.rows[0]!;
};

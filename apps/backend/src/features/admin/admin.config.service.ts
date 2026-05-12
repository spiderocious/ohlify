import { reloadPlatformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as auditRepo from './admin.audit.repo.js';
import type { AdminPatchConfigDto } from './admin.write.schema.js';

interface ConfigRow {
  key: string;
  value: unknown;
  is_public: boolean;
  updated_at: Date;
  updated_by: string | null;
}

// GET /admin/config — return ALL platform_config rows (admin sees private
// keys too). The public endpoint is /platform/config (returns is_public=TRUE
// only).
export const listAllConfig = async () => {
  const res = await pool.query<ConfigRow>(
    `SELECT key, value, is_public, updated_at, updated_by
       FROM platform_config
       ORDER BY key ASC`,
  );
  return new ServiceSuccess(
    {
      items: res.rows.map((r) => ({
        key: r.key,
        value: r.value,
        is_public: r.is_public,
        updated_at: r.updated_at.toISOString(),
        updated_by: r.updated_by,
      })),
    },
    MESSAGE_KEYS.ADMIN_CONFIG_FETCHED,
  );
};

// PATCH /admin/config — UPSERT one or more keys. updated_by FK is set to
// req.adminId when it's a real admin; we skip the FK column for stub-token
// writes (set to NULL).
export const patchConfig = async (dto: AdminPatchConfigDto, adminId: string) => {
  const isStub = adminId === 'adm_stub';
  const updatedBy = isStub ? null : adminId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeRows = await client.query<{ key: string; value: unknown }>(
      `SELECT key, value FROM platform_config WHERE key = ANY($1::text[])`,
      [dto.updates.map((u) => u.key)],
    );
    const beforeMap = new Map(beforeRows.rows.map((r) => [r.key, r.value]));

    for (const update of dto.updates) {
      // UPSERT — admin can introduce a new config key by passing it. The
      // service layer (platform-config.service.ts) only reads keys it
      // expects, so unknown keys are inert until code references them.
      await client.query(
        `INSERT INTO platform_config (key, value, is_public, updated_at, updated_by)
         VALUES ($1, $2::jsonb, FALSE, now(), $3)
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value,
               updated_at = now(),
               updated_by = EXCLUDED.updated_by`,
        [update.key, JSON.stringify(update.value), updatedBy],
      );
    }

    // One audit row covering the whole patch — keys + before/after snapshot.
    await auditRepo.insert(
      {
        adminUserId: updatedBy,
        action: 'config.patch',
        targetType: 'platform_config',
        targetId: null,
        metadata: {
          note: dto.note,
          updates: dto.updates.map((u) => ({
            key: u.key,
            before: beforeMap.get(u.key) ?? null,
            after: u.value,
          })),
          stub_admin: isStub,
        },
      },
      client,
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err }, 'admin patchConfig failed');
    return new ServiceError('internal', MESSAGE_KEYS.ADMIN_CONFIG_UPDATED, 500);
  } finally {
    client.release();
  }

  // Hot-reload the in-memory snapshot so callers see the new values
  // immediately (instead of waiting for the periodic refresh).
  await reloadPlatformConfig();

  return new ServiceSuccess(
    { updated_keys: dto.updates.map((u) => u.key) },
    MESSAGE_KEYS.ADMIN_CONFIG_UPDATED,
  );
};

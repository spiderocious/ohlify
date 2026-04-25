import type { PoolClient } from 'pg';

export const acquireAdvisoryLock = async (client: PoolClient, lockKey: bigint): Promise<void> => {
  await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
};

export const tryAdvisoryLock = async (client: PoolClient, lockKey: bigint): Promise<boolean> => {
  const { rows } = await client.query<{ pg_try_advisory_xact_lock: boolean }>(
    'SELECT pg_try_advisory_xact_lock($1)',
    [lockKey],
  );
  return rows[0]?.pg_try_advisory_xact_lock ?? false;
};

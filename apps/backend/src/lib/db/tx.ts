import type { PoolClient } from 'pg';

import { pool } from './pool.js';

export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Like withTransaction, but lets the callback abandon the work by returning a
 * value the caller deems a failure.
 *
 * Services signal failure by RETURNING a ServiceError rather than throwing, so
 * under plain withTransaction a rejected second step still commits whatever the
 * first step already wrote. Multi-step flows that must be all-or-nothing pass
 * `shouldCommit` to close that gap.
 */
export const withTransactionUnless = async <T>(
  fn: (client: PoolClient) => Promise<T>,
  shouldCommit: (result: T) => boolean,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query(shouldCommit(result) ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

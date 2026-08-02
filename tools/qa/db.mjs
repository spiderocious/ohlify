// QA harness — DB pool. Used by sibling scripts via `import { pool } from './db.mjs'`.
// Connection string is hard-coded for local dev; override via DATABASE_URL if needed.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Resolved by name, not by a pinned .pnpm path — a version bump used to break
// every script in this folder at once.
const pg = require('pg');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://feranmi@localhost:5432/ohlify',
});

// Convenience wrappers
export const query = async (sql, params = []) => {
  const res = await pool.query(sql, params);
  return res.rows;
};

export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] ?? null;
};

// CLI: `node tools/qa/db.mjs "SELECT count(*) FROM users"`
if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = process.argv[2];
  if (!sql) {
    console.error('Usage: node tools/qa/db.mjs "<sql>"');
    process.exit(1);
  }
  const rows = await query(sql);
  for (const r of rows) console.log(JSON.stringify(r));
  await pool.end();
}

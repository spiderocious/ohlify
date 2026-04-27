// Toggle users.deleted_at for F-02 sweep tests. Set or restore.
// Usage:
//   node tools/qa/soft-delete-user.mjs <user_id> delete    # sets deleted_at = now()
//   node tools/qa/soft-delete-user.mjs <user_id> restore   # sets deleted_at = NULL

import { pool } from './db.mjs';

const userId = process.argv[2];
const action = process.argv[3];
if (!userId || (action !== 'delete' && action !== 'restore')) {
  console.error('Usage: node tools/qa/soft-delete-user.mjs <user_id> delete|restore');
  process.exit(1);
}

if (action === 'delete') {
  await pool.query("UPDATE users SET deleted_at = now(), status = 'deleted' WHERE id = $1", [userId]);
  console.log(`${userId}: soft-deleted`);
} else {
  await pool.query("UPDATE users SET deleted_at = NULL, status = 'active' WHERE id = $1", [userId]);
  console.log(`${userId}: restored`);
}
await pool.end();

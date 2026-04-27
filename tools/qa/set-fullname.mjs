// Direct UPDATE on users.full_name. Used by name-match boundary tests.
// Usage: node tools/qa/set-fullname.mjs <user_id> "<full_name>"

import { pool } from './db.mjs';

const userId = process.argv[2];
const name = process.argv[3];
if (!userId || name === undefined) {
  console.error('Usage: node tools/qa/set-fullname.mjs <user_id> "<full_name>"');
  process.exit(1);
}
await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [name, userId]);
console.log(`set ${userId}.full_name = ${JSON.stringify(name)}`);
await pool.end();

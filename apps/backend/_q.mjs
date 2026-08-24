import pg from 'pg';
import fs from 'fs';
const env = fs.readFileSync('.env','utf8');
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const c = new pg.Client({ connectionString: url});
await c.connect();
const r = await c.query(`
  SELECT id, call_type, status, (connected_at IS NOT NULL) AS had_connected,
         connected_seconds, client_reported_seconds, duration_source,
         settled_kobo, seconds_allotted, per_minute_kobo,
         settlement_journal_id IS NOT NULL AS journaled, created_at
  FROM instant_calls ORDER BY created_at DESC LIMIT 12`);
console.table(r.rows);
await c.end();

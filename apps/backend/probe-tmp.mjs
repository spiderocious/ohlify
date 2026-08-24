import { readFileSync } from 'node:fs';
import pg from 'pg';
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const u = await pool.query("SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1");
const uid = u.rows[0]?.id;
console.log('probe user:', uid);
const src = readFileSync('src/features/admin/admin.user-detail.repo.ts','utf8');
const re = /pool\.query<[^>]*>\(\s*(?:\/\/[^\n]*\n\s*)*`([\s\S]*?)`/g;
let m, i=0, pass=0, fail=0;
while ((m = re.exec(src)) !== null) {
  i++; const sql = m[1];
  if (sql.includes('${')) { console.log(`  SKIP #${i}`); continue; }
  const n = new Set([...sql.matchAll(/\$(\d)/g)].map(x=>+x[1])).size;
  try { await pool.query(sql, n===1?[uid]:[uid,12]); pass++; }
  catch (e) { fail++; console.log(`  FAIL #${i}: ${e.message}`); }
}
console.log(`\n${pass} OK, ${fail} failed`);
await pool.end();

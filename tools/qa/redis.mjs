// QA harness — Redis client.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Redis = require('/Users/feranmi/codebases/2026/ohlify/backend/node_modules/.pnpm/ioredis@5.10.1/node_modules/ioredis/built/index.js');

export const redis = new Redis.default(process.env.REDIS_URL ?? 'redis://localhost:6379');

// CLI: `node tools/qa/redis.mjs keys 'rl:*'` or `node tools/qa/redis.mjs get <key>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const arg = process.argv[3];
  if (cmd === 'keys') {
    const keys = await redis.keys(arg ?? '*');
    for (const k of keys) {
      const v = await redis.get(k);
      const ttl = await redis.ttl(k);
      console.log(`${k}\t${v?.slice?.(0, 60) ?? v}\tttl=${ttl}`);
    }
  } else if (cmd === 'get') {
    console.log(await redis.get(arg));
  } else if (cmd === 'del') {
    const keys = await redis.keys(arg);
    if (keys.length) await redis.del(...keys);
    console.log(`deleted ${keys.length} keys`);
  } else {
    console.error('Usage: node tools/qa/redis.mjs keys|get|del <pattern>');
    process.exit(1);
  }
  await redis.quit();
}

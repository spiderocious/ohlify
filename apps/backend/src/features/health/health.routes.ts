import { Router, type IRouter } from 'express';

import { pool } from '@lib/db/pool.js';
import { asyncHandler } from '@lib/http/asyncHandler.js';
import { redis } from '@lib/redis/client.js';
import { ResponseUtil } from '@lib/response.js';

const router: IRouter = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [pgResult, redisResult] = await Promise.allSettled([
      pool.query('SELECT 1'),
      redis.ping(),
    ]);

    const db = pgResult.status === 'fulfilled' ? 'ok' : 'error';
    const cache = redisResult.status === 'fulfilled' ? 'ok' : 'error';
    const status = db === 'ok' && cache === 'ok' ? 'ok' : 'degraded';

    return ResponseUtil.ok(res, { status, db, cache });
  }),
);

export default router;

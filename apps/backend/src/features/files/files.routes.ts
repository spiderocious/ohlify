import { Router } from 'express';
import type { Express } from 'express';

import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';

import * as controller from './files.controller.js';

/**
 * Presigned upload/read URIs — the Go file-service, in-process.
 *
 * Mounted at the ROOT paths the Go service used (`/get-upload-uri`,
 * `/get-file-uri`) so existing clients need only a base-URL change, plus
 * `/api/v1/files/*` aliases for new code that would rather not have
 * unversioned paths.
 *
 * Unauthenticated, matching the service it replaces. Both endpoints only mint
 * signatures — no bytes pass through this process — but note that means anyone
 * who can reach them can mint an upload URL into the bucket, and can read any
 * key they can name. Keys are random UUIDs, so reads are protected by
 * unguessability alone. Rate limits below are the only brake; per-IP, since
 * there is no user to attribute a request to.
 */
export const register = (app: Express): void => {
  const filesRouter = Router();

  filesRouter.get(
    '/get-upload-uri',
    rateLimitMiddleware((req) => `file-upload-uri:${req.ip ?? 'anon'}`, 120, 60),
    controller.getUploadUri,
  );

  filesRouter.get(
    '/get-file-uri',
    // Looser than the upload limit: reads are cheap, cached, and a single
    // screen can legitimately resolve many keys at once (a list of avatars).
    rateLimitMiddleware((req) => `file-get-uri:${req.ip ?? 'anon'}`, 600, 60),
    controller.getFileUri,
  );

  // Legacy root paths — the contract the Go service published.
  app.use('/', filesRouter);
  // Versioned aliases. Same handlers, same bare-JSON bodies.
  app.use('/api/v1/files', filesRouter);
};

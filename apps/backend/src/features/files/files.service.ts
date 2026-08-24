import { randomUUID } from 'node:crypto';

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '@lib/logger.js';
import { redis } from '@lib/redis/client.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { s3, S3_BUCKET } from '@lib/storage/s3.js';

import { FILES_MESSAGES } from './files.messages.js';
import type { FileUriQuery, UploadUriQuery } from './files.schema.js';
import {
  CACHE_KEY_PREFIX,
  FILE_URI_CACHE_TTL_SECONDS,
  FILE_URI_TTL_SECONDS,
  UPLOAD_URI_TTL_SECONDS,
  type FileUriView,
  type UploadUriView,
} from './files.types.js';

/**
 * Composes the storage key: `[prefix-]uuid[-suffix][.ext]`.
 *
 * Server-generated on purpose — a client-supplied name would let a caller
 * overwrite someone else's object by guessing its key.
 */
const buildKey = (query: UploadUriQuery): string => {
  let key = randomUUID();
  if (query.prefix !== undefined) key = `${query.prefix}-${key}`;
  if (query.suffix !== undefined) key = `${key}-${query.suffix}`;
  if (query.ext !== undefined) key = `${key}.${query.ext}`;
  return key;
};

const presignGet = (key: string): Promise<string> =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: FILE_URI_TTL_SECONDS,
  });

/**
 * Signs and caches the GET URL for a freshly-minted upload key, so the first
 * read after an upload is a cache hit rather than a round-trip to sign.
 *
 * Deliberately not awaited by the caller — this is a warm-up, and a failure
 * here costs a cache miss later, nothing more. It therefore swallows its own
 * errors: an unhandled rejection escaping a floating promise would take the
 * process down over an optimisation.
 */
const prewarmFileUri = (key: string): void => {
  void (async () => {
    try {
      const uri = await presignGet(key);
      await redis.set(CACHE_KEY_PREFIX + key, uri, 'EX', FILE_URI_CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn({ err, key }, 'file-uri prewarm failed');
    }
  })();
};

export const createUploadUri = async (query: UploadUriQuery) => {
  const key = buildKey(query);

  let uri: string;
  try {
    uri = await getSignedUrl(s3, new PutObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
      expiresIn: UPLOAD_URI_TTL_SECONDS,
    });
  } catch (err) {
    logger.error({ err, key }, 'failed to presign upload uri');
    return new ServiceError('upstream_unavailable', FILES_MESSAGES.UPLOAD_URI_FAILED, 500);
  }

  prewarmFileUri(key);

  const view: UploadUriView = { key, uri, expires_in: '15m' };
  return new ServiceSuccess(view, FILES_MESSAGES.UPLOAD_URI_CREATED);
};

export const getFileUri = async (query: FileUriQuery) => {
  const { key } = query;
  const cacheKey = CACHE_KEY_PREFIX + key;

  // A cache read failing is not a request failure — fall through and sign.
  // Redis being down should make this endpoint slower, never broken.
  try {
    const cached = await redis.get(cacheKey);
    if (typeof cached === 'string' && cached.length > 0) {
      const view: FileUriView = { uri: cached, expires_in: '1h', cached: true };
      return new ServiceSuccess(view, FILES_MESSAGES.FILE_URI_FETCHED);
    }
  } catch (err) {
    logger.warn({ err, key }, 'file-uri cache read failed');
  }

  let uri: string;
  try {
    uri = await presignGet(key);
  } catch (err) {
    logger.error({ err, key }, 'failed to presign file uri');
    return new ServiceError('upstream_unavailable', FILES_MESSAGES.FILE_URI_FAILED, 500);
  }

  try {
    await redis.set(cacheKey, uri, 'EX', FILE_URI_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, key }, 'file-uri cache write failed');
  }

  const view: FileUriView = { uri, expires_in: '1h', cached: false };
  return new ServiceSuccess(view, FILES_MESSAGES.FILE_URI_FETCHED);
};

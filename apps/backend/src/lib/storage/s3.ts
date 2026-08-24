import { S3Client } from '@aws-sdk/client-s3';

import { env } from '../../env.js';

/**
 * S3-compatible client for the files feature.
 *
 * Provider-agnostic by construction: `BaseEndpoint` + path-style addressing is
 * all that separates Tigris/t3.dev from Cloudflare R2 or MinIO, and all five
 * inputs are env vars. Switching providers is a config change — no code moves.
 * (Existing objects do not follow the endpoint, though: keys are stored bare
 * (`uuid.ext`), so a provider switch needs the bucket contents copied across or
 * previously-uploaded files 404.)
 *
 * `forcePathStyle` mirrors the Go service's `UsePathStyle = true`. Without it
 * the SDK builds virtual-host URLs (`bucket.host/key`), which non-AWS providers
 * generally do not serve.
 */
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // Newer AWS SDK releases add `x-amz-sdk-checksum-algorithm` / CRC32 headers
  // to PUTs by default. S3-compatible providers reject those on presigned
  // uploads — the client PUTting the file never sends the header the signature
  // covers, so the request fails with SignatureDoesNotMatch. WHEN_REQUIRED
  // keeps checksums off unless an operation genuinely needs them.
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export const S3_BUCKET = env.S3_BUCKET;

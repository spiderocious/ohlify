/**
 * Wire shapes for the files feature.
 *
 * These are byte-identical to the Go file-service they replace, INCLUDING the
 * absence of the usual `{ data }` envelope — see the note in files.controller.ts.
 * Field names, ordering, and the human-readable `expires_in` strings are all
 * part of the contract that shipped mobile builds already parse.
 */

/** `GET /get-upload-uri` */
export interface UploadUriView {
  key: string;
  uri: string;
  expires_in: string;
}

/** `GET /get-file-uri` */
export interface FileUriView {
  uri: string;
  expires_in: string;
  /** Whether the URL came from Redis rather than a fresh signature. */
  cached: boolean;
}

/** How long a presigned PUT stays valid. Matches the Go service. */
export const UPLOAD_URI_TTL_SECONDS = 15 * 60;

/** How long a presigned GET stays valid. Matches the Go service. */
export const FILE_URI_TTL_SECONDS = 60 * 60;

/**
 * Cache TTL, deliberately shorter than [FILE_URI_TTL_SECONDS].
 *
 * The 10-minute margin means a URL served from cache always has real time left
 * on it. Caching for the full hour would let a request at T+59m hand back a
 * signature expiring in 60 seconds, which fails mid-download.
 */
export const FILE_URI_CACHE_TTL_SECONDS = 50 * 60;

export const CACHE_KEY_PREFIX = 'file-uri:';

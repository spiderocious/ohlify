/**
 * Thin client for the external Go file service. Backend never touches the
 * binary payload — clients PUT directly to object storage and persist only
 * the returned `key`. To READ a stored object, mint a short-lived signed
 * GET URL via `getViewUri(key)`.
 *
 * This module is shared by customer-web and admin-web — the customer-web
 * fork in `apps/customer-web/src/shared/lib/file-uploads.ts` should
 * eventually be deleted in favor of importing from here.
 */

const FILE_SERVICE_BASE = 'https://go-file-service-production.up.railway.app';

export interface UploadUriResponse {
  expires_in: string;
  key: string;
  uri: string;
}

export interface ViewUriResponse {
  cached: boolean;
  expires_in: string;
  uri: string;
}

const VALID_EXT = /^[a-z0-9]+$/i;

export async function mintUploadUri(ext: string): Promise<UploadUriResponse> {
  if (!VALID_EXT.test(ext)) {
    throw new Error(`mintUploadUri: invalid extension "${ext}"`);
  }
  const res = await fetch(`${FILE_SERVICE_BASE}/get-upload-uri?ext=${encodeURIComponent(ext)}`);
  if (!res.ok) throw new Error(`mintUploadUri: ${res.status} ${res.statusText}`);
  return (await res.json()) as UploadUriResponse;
}

export async function getViewUri(key: string): Promise<ViewUriResponse> {
  const res = await fetch(`${FILE_SERVICE_BASE}/get-file-uri?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`getViewUri: ${res.status} ${res.statusText}`);
  return (await res.json()) as ViewUriResponse;
}

export async function uploadFile(file: File): Promise<{ key: string }> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ext) throw new Error('uploadFile: file has no extension');
  const { key, uri } = await mintUploadUri(ext);
  const putRes = await fetch(uri, { method: 'PUT', body: file });
  if (!putRes.ok) throw new Error(`uploadFile: PUT failed ${putRes.status}`);
  return { key };
}

/**
 * Sniffs a content-type-ish category from the file key's extension. Useful
 * for branching renderers between image / pdf / generic. Returns null when
 * the key has no extension we recognize.
 */
export type FilePreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'other';

export function detectFileKind(key: string | null | undefined): FilePreviewKind {
  if (!key) return 'other';
  const ext = (key.split('.').pop() ?? '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) return 'audio';
  return 'other';
}

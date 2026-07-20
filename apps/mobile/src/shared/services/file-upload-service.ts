import { Env } from '@shared/config/env';

/**
 * Thin client for the external file service. Mirrors
 * mobile/lib/shared/services/file_upload_service.dart. Two operations:
 *  - mintUploadUri(ext) -> { key, uri } one-shot PUT URL
 *  - getViewUri(key)     -> pre-signed GET URL
 *
 * The Ohlify backend never touches binary bytes — clients PUT directly to
 * object storage and persist only the resulting `key`.
 */
const VALID_EXT = /^[a-z0-9]+$/i;

export interface UploadUriResponse {
  expiresIn: string;
  key: string;
  uri: string;
}

function uploadUriFromJson(json: Record<string, unknown>): UploadUriResponse {
  return {
    expiresIn: json.expires_in as string,
    key: json.key as string,
    uri: json.uri as string,
  };
}

async function mintUploadUri(ext: string): Promise<UploadUriResponse> {
  if (!VALID_EXT.test(ext)) {
    throw new Error(`Invalid file extension: ${ext}`);
  }
  const url = new URL('/get-upload-uri', Env.fileServiceUrl);
  url.searchParams.set('ext', ext.toLowerCase());
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to mint upload URI: HTTP ${response.status}`);
  }
  return uploadUriFromJson(await response.json());
}

async function getViewUri(key: string): Promise<string> {
  const url = new URL('/get-file-uri', Env.fileServiceUrl);
  url.searchParams.set('key', key);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get view URI: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { uri: string };
  return data.uri;
}

function extensionOf(pathOrName: string): string | null {
  const dot = pathOrName.lastIndexOf('.');
  if (dot === -1 || dot === pathOrName.length - 1) return null;
  return pathOrName.slice(dot + 1).toLowerCase();
}

/**
 * expo-document-picker / expo-image-picker both return a `{ uri, name?,
 * mimeType? }`-shaped asset on every platform (including web, where `uri` is
 * a blob: URL) — unlike Flutter's file_picker, there's no separate
 * bytes-vs-path branch to handle here.
 */
export interface PickedFile {
  uri: string;
  name: string;
}

/** High-level helper: mint an upload URL, PUT the bytes, return the resulting `key`. */
async function uploadPicked(picked: PickedFile): Promise<string> {
  const ext = extensionOf(picked.name);
  if (!ext) {
    throw new Error(`File has no extension: ${picked.name}`);
  }
  const mint = await mintUploadUri(ext);
  const fileResponse = await fetch(picked.uri);
  const blob = await fileResponse.blob();
  const putResponse = await fetch(mint.uri, { method: 'PUT', body: blob });
  if (!putResponse.ok) {
    throw new Error(`Upload failed: HTTP ${putResponse.status}`);
  }
  return mint.key;
}

export const fileUploadService = { mintUploadUri, getViewUri, uploadPicked };

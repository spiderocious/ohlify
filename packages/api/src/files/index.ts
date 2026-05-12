export {
  mintUploadUri,
  getViewUri,
  uploadFile,
  detectFileKind,
} from './file-service.js';
export type {
  UploadUriResponse,
  ViewUriResponse,
  FilePreviewKind,
} from './file-service.js';

export { useFilePreview, invalidateFilePreview } from './use-file-preview.js';
export type {
  UseFilePreviewOptions,
  UseFilePreviewResult,
} from './use-file-preview.js';

// Cache primitives — exported for advanced consumers (e.g. log-out flow
// calling clearBlobCache). Most consumers don't need these.
export { lookupUri, forgetUri, listCachedKeys } from './uri-cache.js';
export {
  readBlobUrl,
  cacheBlobFromUri,
  forgetBlob,
  clearBlobCache,
} from './blob-cache.js';

import { useState } from 'react';

import { detectFileKind, useFilePreview } from '@ohlify/api';
import { AppText, cn } from '@ohlify/ui';
import { IconAlertCircle, IconFileText } from '@icons';

interface FilePreviewProps {
  fileKey?: string | null;
  /** Optional label shown for non-image kinds + as `alt`. */
  label?: string;
  /** Square preview height for images. Default 320px. */
  height?: number;
  className?: string;
}

/**
 * Renders any file-service key as the most useful preview for its type:
 *
 *   - image: inline `<img>` clickable to open full-size in a new tab
 *   - pdf:   inline iframe of the signed URL (most browsers render PDFs)
 *   - other: an "Open" link with a file icon
 *
 * Loading + error states render in-line — caller doesn't need to wrap in
 * a query view. When `fileKey` is empty we render a muted "No file" tile.
 */
export function FilePreview({ fileKey, label, height = 320, className }: FilePreviewProps) {
  const kind = detectFileKind(fileKey);
  const { uri, isLoading, error } = useFilePreview(fileKey);
  const [imgFailed, setImgFailed] = useState(false);

  if (!fileKey) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-border bg-surface-light p-6 text-text-muted',
          className,
        )}
        style={{ minHeight: height }}
      >
        <AppText variant="bodySmall">No file uploaded</AppText>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-border bg-surface-light text-text-muted',
          className,
        )}
        style={{ minHeight: height }}
      >
        <AppText variant="bodySmall">Loading preview…</AppText>
      </div>
    );
  }

  if (error || !uri) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface p-6 text-center',
          className,
        )}
        style={{ minHeight: height }}
      >
        <IconAlertCircle size={28} color="var(--ohl-error)" />
        <AppText variant="bodySmall" className="text-text-muted">
          Couldn't load preview
        </AppText>
        <code className="text-[10px] text-text-muted break-all">{fileKey}</code>
      </div>
    );
  }

  if (kind === 'image' && !imgFailed) {
    return (
      <a
        href={uri}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'block overflow-hidden rounded-md border border-border bg-surface-light',
          className,
        )}
      >
        <img
          src={uri}
          alt={label ?? 'preview'}
          className="block w-full bg-checker object-contain"
          style={{ maxHeight: height }}
          onError={() => setImgFailed(true)}
        />
      </a>
    );
  }

  if (kind === 'pdf') {
    return (
      <div
        className={cn('overflow-hidden rounded-md border border-border bg-surface', className)}
      >
        <iframe
          src={uri}
          title={label ?? 'PDF preview'}
          className="block w-full"
          style={{ height }}
        />
        <div className="border-t border-border bg-surface-light px-3 py-2">
          <a
            href={uri}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Open PDF in new tab ↗
          </a>
        </div>
      </div>
    );
  }

  // Non-previewable: link out
  return (
    <a
      href={uri}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-light',
        className,
      )}
    >
      <IconFileText size={20} color="var(--ohl-primary)" />
      <span className="flex-1 truncate text-text-primary">{label ?? fileKey}</span>
      <span className="text-xs font-semibold text-primary">Open ↗</span>
    </a>
  );
}

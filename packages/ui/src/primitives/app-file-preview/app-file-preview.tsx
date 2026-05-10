import type { CSSProperties, ReactNode } from 'react';

import { detectFileKind, useFilePreview, type FilePreviewKind } from '@ohlify/api';

import { cn } from '../../utils/cn.js';
import { AppLoader } from '../app-loader/app-loader.js';

export interface AppFilePreviewProps {
  /**
   * File-service key (e.g. `8204e793-….jpg`). When `null`/`undefined`, no
   * fetch fires and the `fallback` is rendered.
   */
  fileKey: string | null | undefined;
  /** Width in CSS px when number; passed through verbatim when string. */
  width?: number | string;
  /** Height in CSS px when number; passed through verbatim when string. */
  height?: number | string;
  /** Border radius in px. Default `0`. */
  radius?: number;
  /** Forwarded onto the wrapper. */
  className?: string;
  /** Inline style escape hatch on the wrapper. */
  style?: CSSProperties;
  /** alt text used when `kind` resolves to `image`. */
  alt?: string;
  /** `cover` (default) or `contain` — passed through as `object-fit`. */
  fit?: 'cover' | 'contain';
  /**
   * Rendered when `fileKey` is null/empty or the resolved URL fails — the
   * "no file" state. Use this for placeholder icons (e.g. `<IconUser>` on
   * an avatar). Pass `null` to suppress.
   */
  fallback?: ReactNode;
  /**
   * Rendered while a non-null `fileKey` is being resolved. Defaults to a
   * centered `<AppLoader>` spinner sized to the smaller wrapper dimension.
   * Pass `null` to suppress (useful when you'd rather show `fallback` for
   * both "no file" and "loading").
   */
  loadingFallback?: ReactNode;
  /** Force a specific kind. Otherwise sniffed from the key's extension. */
  kind?: FilePreviewKind;
  /**
   * Skip both URI- and bytes-caches for this preview. Each mount re-mints
   * a presigned URL. Default `false`.
   */
  noCache?: boolean;
  /** Spinner size in px while loading. Default scales with the smaller dimension. */
  loaderSize?: number;
}

const sizeFor = (v: number | string | undefined): string | undefined =>
  typeof v === 'number' ? `${v}px` : v;

const DEFAULT_FALLBACK = Symbol('default-loader');

/**
 * Resolves a file-service key to a presigned URL and renders the right
 * element for its kind. Image is the common case; PDFs render as a
 * clickable link, video/audio as their respective tags. While the URL is
 * resolving, a centered `<AppLoader>` spinner shows by default.
 *
 * The `useFilePreview` hook used internally has two cache layers (URI →
 * localStorage; bytes → Cache API), so most renders short-circuit the
 * network entirely. Pass `noCache` to disable both for this preview.
 */
export function AppFilePreview({
  fileKey,
  width,
  height,
  radius = 0,
  className,
  style,
  alt,
  fit = 'cover',
  fallback = null,
  loadingFallback = DEFAULT_FALLBACK as unknown as ReactNode,
  kind: kindOverride,
  noCache = false,
  loaderSize,
}: AppFilePreviewProps) {
  const { uri, isLoading, error } = useFilePreview({ key: fileKey, noCache });
  const kind = kindOverride ?? detectFileKind(fileKey);

  const wrapperStyle: CSSProperties = {
    width: sizeFor(width),
    height: sizeFor(height),
    borderRadius: radius,
    overflow: 'hidden',
    ...style,
  };

  const showFallback = !fileKey || isLoading || error || !uri;

  // Pick fallback: "loadingFallback" (spinner default) when actively loading
  // a non-null key, "fallback" (caller-provided icon, default null) otherwise.
  let resolvedFallback: ReactNode = null;
  if (showFallback) {
    if (fileKey && isLoading) {
      if (loadingFallback === (DEFAULT_FALLBACK as unknown as ReactNode)) {
        const sized =
          loaderSize ??
          (() => {
            const w = typeof width === 'number' ? width : Number.NaN;
            const h = typeof height === 'number' ? height : Number.NaN;
            const min = Math.min(
              Number.isFinite(w) ? w : Infinity,
              Number.isFinite(h) ? h : Infinity,
            );
            if (!Number.isFinite(min)) return 24;
            return Math.max(14, Math.min(32, Math.round(min * 0.4)));
          })();
        resolvedFallback = <AppLoader size={sized} />;
      } else {
        resolvedFallback = loadingFallback;
      }
    } else {
      resolvedFallback = fallback;
    }
  }

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center bg-surface', className)}
      style={wrapperStyle}
    >
      {showFallback ? (
        resolvedFallback
      ) : kind === 'image' ? (
        <img src={uri} alt={alt ?? ''} className="h-full w-full" style={{ objectFit: fit }} />
      ) : kind === 'video' ? (
        <video src={uri} controls className="h-full w-full" style={{ objectFit: fit }} />
      ) : kind === 'audio' ? (
        <audio src={uri} controls className="w-full" />
      ) : kind === 'pdf' ? (
        <a
          href={uri}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-primary underline"
        >
          Open PDF
        </a>
      ) : (
        <a
          href={uri}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-primary underline"
        >
          Open file
        </a>
      )}
    </div>
  );
}

import type { CSSProperties } from 'react';

import { IconUser } from '@icons';

import { AppFilePreview } from '../app-file-preview/app-file-preview.js';

export interface AppAvatarProps {
  /**
   * File-service key for the avatar (e.g. `8204e793-….jpg`). When `null` /
   * `undefined`, the fallback `<IconUser>` placeholder is rendered.
   */
  fileKey: string | null | undefined;
  /** Square size in px. Default `40`. */
  size?: number;
  /**
   * Border radius. Defaults to `size / 2` (full circle). Pass an explicit
   * value (e.g. `12`) for square-ish avatars.
   */
  radius?: number;
  /** alt text for the underlying `<img>`. Defaults to empty (decorative). */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Skip both URI- and bytes-caches. Each render re-mints a presigned URL.
   * Default `false`.
   */
  noCache?: boolean;
}

/**
 * Round-photo wrapper around `<AppFilePreview>`. While the file resolves,
 * the standard spinner shows; when there's no `fileKey` we fall back to
 * `<IconUser>`. Both states sit on the same tinted-surface background.
 */
export function AppAvatar({
  fileKey,
  size = 40,
  radius,
  alt,
  className,
  style,
  noCache = false,
}: AppAvatarProps) {
  const r = radius ?? Math.round(size / 2);
  const iconSize = Math.max(12, Math.round(size * 0.48));
  return (
    <AppFilePreview
      fileKey={fileKey}
      kind="image"
      width={size}
      height={size}
      radius={r}
      alt={alt}
      fit="cover"
      className={className}
      style={style}
      noCache={noCache}
      fallback={<IconUser size={iconSize} color="var(--ohl-border)" />}
    />
  );
}

import type { CSSProperties } from 'react';

interface AppSvgProps {
  src: string;
  /** Sets both width and height. */
  size?: number;
  width?: number;
  height?: number;
  /** Applied as a CSS filter mask color. Falls back to plain <img> when null. */
  color?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Mirrors mobile AppSvg. Renders an SVG asset URL. When `color` is set, it
 * uses a CSS mask trick to tint a flat-colored SVG (matches Flutter's
 * ColorFilter.mode srcIn).
 */
export function AppSvg({
  src,
  size,
  width,
  height,
  color,
  alt = '',
  className,
  style,
}: AppSvgProps) {
  const w = width ?? size;
  const h = height ?? size;

  if (color) {
    return (
      <span
        role={alt ? 'img' : 'presentation'}
        aria-label={alt || undefined}
        className={className}
        style={{
          display: 'inline-block',
          width: w,
          height: h,
          backgroundColor: color,
          WebkitMask: `url(${src}) no-repeat center / contain`,
          mask: `url(${src}) no-repeat center / contain`,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain', ...style }}
    />
  );
}

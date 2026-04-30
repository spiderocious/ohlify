import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppTagVariant = 'solid' | 'outline' | 'subtle' | 'surface';
export type AppTagRadius = 'full' | 'large' | 'small' | 'none';
export type AppTagSize = 'small' | 'medium' | 'large';

interface AppTagProps {
  label: string;
  variant?: AppTagVariant;
  /** Override fill (solid) or border+text (outline/subtle/surface). */
  color?: string;
  size?: AppTagSize;
  radius?: AppTagRadius;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onTap?: () => void;
  disabled?: boolean;
  className?: string;
}

// 1:1 with mobile/lib/ui/widgets/app_tag/app_tag.dart
const DEFAULT_TEXT = '#344272';
const DEFAULT_BORDER = '#CED2DD';
const DEFAULT_SOLID = 'var(--ohl-primary)';
const DEFAULT_SURFACE = '#E8F5E9';
const DEFAULT_SUBTLE = '#EEEDF9';

const RADIUS: Record<AppTagRadius, number> = { full: 999, large: 8, small: 4, none: 0 };
const PADDING: Record<AppTagSize, string> = {
  small: '4px 8px',
  medium: '6px 12px',
  large: '9px 16px',
};
const FONT_SIZE: Record<AppTagSize, number> = { small: 10, medium: 12, large: 14 };
const ICON_SIZE: Record<AppTagSize, number> = { small: 12, medium: 14, large: 16 };

export function AppTag({
  label,
  variant = 'outline',
  color,
  size = 'medium',
  radius = 'full',
  startIcon,
  endIcon,
  onTap,
  disabled = false,
  className,
}: AppTagProps) {
  const bg =
    variant === 'solid'
      ? (color ?? DEFAULT_SOLID)
      : variant === 'outline'
        ? 'transparent'
        : variant === 'subtle'
          ? DEFAULT_SUBTLE
          : (color ?? DEFAULT_SURFACE);

  const fg =
    variant === 'solid'
      ? '#ffffff'
      : variant === 'surface'
        ? (color ?? '#1F6F15')
        : (color ?? DEFAULT_TEXT);

  const border = variant === 'outline' ? `1px solid ${color ?? DEFAULT_BORDER}` : 'none';

  const styles: CSSProperties = {
    backgroundColor: bg,
    color: fg,
    border,
    borderRadius: RADIUS[radius],
    padding: PADDING[size],
    fontFamily: 'var(--font-sans, "Mona Sans Variable")',
    fontSize: FONT_SIZE[size],
    fontWeight: 600,
    letterSpacing: 0.4,
    opacity: disabled ? 0.45 : 1,
    transition: 'opacity 150ms ease',
  };

  const inner = (
    <>
      {startIcon ? (
        <span
          className="inline-flex items-center justify-center"
          style={{ width: ICON_SIZE[size], height: ICON_SIZE[size], marginRight: 5 }}
        >
          {startIcon}
        </span>
      ) : null}
      <span>{label}</span>
      {endIcon ? (
        <span
          className="inline-flex items-center justify-center"
          style={{ width: ICON_SIZE[size], height: ICON_SIZE[size], marginLeft: 5 }}
        >
          {endIcon}
        </span>
      ) : null}
    </>
  );

  if (onTap && !disabled) {
    return (
      <button
        type="button"
        onClick={onTap}
        style={styles}
        className={cn('inline-flex items-center align-middle', className)}
      >
        {inner}
      </button>
    );
  }

  return (
    <span style={styles} className={cn('inline-flex items-center align-middle', className)}>
      {inner}
    </span>
  );
}

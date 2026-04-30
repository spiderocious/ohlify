import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppIconButtonVariant = 'filled' | 'outline' | 'ghost';
export type AppIconButtonShape = 'circle' | 'squircle';

interface AppIconButtonProps {
  icon: ReactNode;
  onPressed?: () => void;
  variant?: AppIconButtonVariant;
  shape?: AppIconButtonShape;
  /** Overrides the default background for the variant. */
  backgroundColor?: string;
  /** Border color for outline variant. Defaults to --ohl-primary. */
  borderColor?: string;
  /** Tap target + container size. Default 52. */
  size?: number;
  /** Inner icon size. Default size * 0.45. */
  iconSize?: number;
  isDisabled?: boolean;
  /** Corner radius when shape is squircle. Default 16. */
  squircleRadius?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * 1:1 with mobile/lib/ui/widgets/app_icon_button/app_icon_button.dart.
 * Filled (primary), outline (transparent + primary border), ghost (callico).
 * Circle or squircle; opacity 0.45 when disabled, 150ms ease transition.
 */
export function AppIconButton({
  icon,
  onPressed,
  variant = 'filled',
  shape = 'circle',
  backgroundColor,
  borderColor,
  size = 52,
  iconSize,
  isDisabled = false,
  squircleRadius = 16,
  className,
  ariaLabel,
}: AppIconButtonProps) {
  const effectivelyDisabled = isDisabled || !onPressed;
  const innerIconSize = iconSize ?? size * 0.45;

  const defaultBg =
    variant === 'filled'
      ? 'var(--ohl-primary)'
      : variant === 'outline'
        ? 'transparent'
        : 'var(--ohl-callico)';

  const styles: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: backgroundColor ?? defaultBg,
    borderRadius: shape === 'circle' ? '50%' : `${squircleRadius}px`,
    border:
      variant === 'outline' ? `2.5px solid ${borderColor ?? 'var(--ohl-primary)'}` : undefined,
    opacity: effectivelyDisabled ? 0.45 : 1,
    transition: 'opacity 150ms ease',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={effectivelyDisabled}
      onClick={onPressed}
      style={styles}
      className={cn(
        'inline-flex items-center justify-center align-middle outline-none focus-visible:ring-2 focus-visible:ring-primary',
        effectivelyDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{ width: innerIconSize, height: innerIconSize }}
      >
        {icon}
      </span>
    </button>
  );
}

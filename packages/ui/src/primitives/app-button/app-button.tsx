import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppButtonVariant = 'solid' | 'outline' | 'plain' | 'subtle';

interface AppButtonProps {
  label?: string;
  /** Replaces the default label+icon layout entirely. */
  children?: ReactNode;
  onPressed?: () => void;
  variant?: AppButtonVariant;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** Border radius in px. Default 12. Use 100 for pill. */
  radius?: number;
  width?: number | string;
  /** Default 52. */
  height?: number;
  /** Stretch to fill parent width. */
  expanded?: boolean;
  /** Default `0 16px`. */
  padding?: string;
  textStyle?: CSSProperties;
  /** Whether to show a border. Default true for outline, false otherwise. */
  bordered?: boolean;
  /** Border color when bordered. Default --ohl-border (outline overrides to --ohl-primary). */
  borderColor?: string;
  className?: string;
}

/**
 * 1:1 with mobile/lib/ui/widgets/app_button/app_button.dart.
 * Variants: solid (primary bg, white text), outline (transparent + primary
 * border), plain (secondary bg, primary text), subtle (white bg, primary text).
 */
export function AppButton({
  label,
  children,
  onPressed,
  variant = 'solid',
  startIcon,
  endIcon,
  isLoading = false,
  isDisabled = false,
  radius = 12,
  width,
  height = 52,
  expanded = false,
  padding,
  textStyle,
  bordered,
  borderColor = 'var(--ohl-border)',
  className,
}: AppButtonProps) {
  const effectivelyDisabled = isDisabled || isLoading || !onPressed;

  const bg =
    variant === 'solid'
      ? 'var(--ohl-primary)'
      : variant === 'outline'
        ? 'transparent'
        : variant === 'plain'
          ? 'var(--ohl-secondary)'
          : '#ffffff'; // subtle

  const fg = variant === 'solid' ? '#ffffff' : 'var(--ohl-primary)';

  const isBordered = bordered ?? variant === 'outline';
  const effectiveBorderColor =
    variant === 'outline' && bordered === undefined ? 'var(--ohl-primary)' : borderColor;

  const styles: CSSProperties = {
    width: expanded ? '100%' : width,
    height,
    backgroundColor: bg,
    borderRadius: `${radius}px`,
    border: isBordered ? `1.5px solid ${effectiveBorderColor}` : 'none',
    color: fg,
    padding: padding ?? '0 16px',
    opacity: effectivelyDisabled ? 0.45 : 1,
    transition: 'opacity 150ms ease',
    fontWeight: 600,
    fontSize: 16,
    ...textStyle,
  };

  // The label/icon row mirrors the Flutter layout: with an endIcon the label
  // left-aligns and the icon flush-rights via `Spacer()`; without icons it's
  // centered.
  const hasIcons = Boolean(startIcon || endIcon);

  const content = children ?? (
    <span
      className={cn(
        'flex h-full w-full items-center font-sans',
        hasIcons ? 'justify-start gap-2' : 'justify-center',
      )}
    >
      {startIcon}
      {isLoading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <span>{label}</span>
      )}
      {endIcon ? (
        <>
          <span className="flex-1" />
          {endIcon}
        </>
      ) : null}
    </span>
  );

  return (
    <button
      type="button"
      disabled={effectivelyDisabled}
      onClick={onPressed}
      style={styles}
      className={cn(
        'inline-flex items-center align-middle outline-none focus-visible:ring-2 focus-visible:ring-primary',
        effectivelyDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        !expanded && width === undefined ? 'w-fit' : undefined,
        className,
      )}
    >
      {content}
    </button>
  );
}

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppBannerVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface AppBannerProps {
  children: ReactNode;
  variant?: AppBannerVariant;
  rounded?: boolean;
  onTap?: () => void;
  /** Override the variant background. */
  backgroundColor?: string;
  className?: string;
  style?: CSSProperties;
}

const VARIANT_BG: Record<AppBannerVariant, string> = {
  primary: '#EAE8FC',
  success: '#DCFCE7',
  warning: '#FFF7ED',
  error: '#FEE2E2',
  info: '#EFF6FF',
  neutral: 'var(--ohl-surface)',
};

/** Mirrors mobile AppBanner — colored container with optional radius + tap. */
export function AppBanner({
  children,
  variant = 'primary',
  rounded = true,
  onTap,
  backgroundColor,
  className,
  style,
}: AppBannerProps) {
  const inline: CSSProperties = {
    backgroundColor: backgroundColor ?? VARIANT_BG[variant],
    borderRadius: rounded ? 16 : 0,
    padding: 16,
    ...style,
  };

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        style={inline}
        className={cn('block w-full text-left', className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div style={inline} className={className}>
      {children}
    </div>
  );
}

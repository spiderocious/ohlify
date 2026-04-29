import type { ElementType, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppTextVariant =
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'labelLarge';

interface AppTextProps {
  children: ReactNode;
  variant?: AppTextVariant;
  as?: ElementType;
  className?: string;
}

const variantClass: Record<AppTextVariant, string> = {
  bodyLarge: 'text-base font-normal text-text-primary',
  bodyMedium: 'text-sm font-normal text-text-primary',
  bodySmall: 'text-xs font-normal text-text-muted',
  titleLarge: 'text-[22px] font-bold text-text-primary',
  titleMedium: 'text-base font-semibold text-text-primary',
  titleSmall: 'text-sm font-semibold text-text-primary',
  labelLarge: 'text-sm font-semibold',
};

/**
 * Typography primitive. Mirrors the mobile app's `AppText` widget.
 * Pass `as` to render as a different element (h1, p, span, etc.).
 */
export function AppText({ children, variant = 'bodyMedium', as, className }: AppTextProps) {
  const Component: ElementType = as ?? 'span';
  return <Component className={cn(variantClass[variant], className)}>{children}</Component>;
}

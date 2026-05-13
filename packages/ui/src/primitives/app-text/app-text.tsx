import type { CSSProperties, ElementType, ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * Mirrors mobile/lib/ui/widgets/app_text/app_text.dart variants exactly.
 * Don't add new variants here without adding them on mobile too.
 */
export type AppTextVariant =
  | 'title'
  | 'subtitle'
  | 'header'
  | 'subheader'
  | 'label'
  | 'medium'
  | 'bodyTitle'
  | 'body'
  | 'bodyNormal'
  | 'bodySmall'
  | 'bodySmallest';

interface AppTextProps {
  children: ReactNode;
  variant?: AppTextVariant;
  as?: ElementType;
  className?: string;
  /** Override color via inline style (any hex / CSS color). */
  color?: string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | 'justify';
  weight?: 400 | 500 | 600 | 700 | 800 | 900;
  width?: number | string;
  maxLines?: number;
  style?: CSSProperties;
}

interface VariantSpec {
  fontSize: number;
  weight: 400 | 500 | 600 | 700;
  lineHeight: number;
  letterSpacing?: number;
  defaultColor: string;
  defaultAlign: 'start' | 'center';
}

// Numbers come straight from app_text.dart. Don't drift.
const VARIANTS: Record<AppTextVariant, VariantSpec> = {
  title: {
    fontSize: 24,
    weight: 600,
    lineHeight: 40,
    letterSpacing: -0.48,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  subtitle: {
    fontSize: 14,
    weight: 400,
    lineHeight: 24,
    defaultColor: 'var(--ohl-text-muted)',
    defaultAlign: 'center',
  },
  header: {
    fontSize: 22,
    weight: 600,
    lineHeight: 30,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  subheader: {
    fontSize: 16,
    weight: 400,
    lineHeight: 24,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  label: {
    fontSize: 12,
    weight: 400,
    lineHeight: 21,
    defaultColor: 'var(--ohl-text-muted)',
    defaultAlign: 'start',
  },
  medium: {
    fontSize: 18,
    weight: 600,
    lineHeight: 24,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'center',
  },
  bodyTitle: {
    fontSize: 20,
    weight: 500,
    lineHeight: 32,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  body: {
    fontSize: 14,
    weight: 400,
    lineHeight: 20,
    letterSpacing: -0.14,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'center',
  },
  bodyNormal: {
    fontSize: 12,
    weight: 500,
    lineHeight: 20,
    letterSpacing: -0.14,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  bodySmall: {
    fontSize: 10,
    weight: 500,
    lineHeight: 20,
    letterSpacing: -0.14,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
  bodySmallest: {
    fontSize: 8,
    weight: 400,
    lineHeight: 20,
    letterSpacing: -0.14,
    defaultColor: 'var(--ohl-text-primary)',
    defaultAlign: 'start',
  },
};

function alignClass(align: AppTextProps['align']): string | undefined {
  switch (align) {
    case 'start':
    case 'left':
      return 'text-left';
    case 'end':
    case 'right':
      return 'text-right';
    case 'center':
      return 'text-center';
    case 'justify':
      return 'text-justify';
    default:
      return undefined;
  }
}

export function AppText({
  children,
  variant = 'body',
  as,
  className,
  color,
  align,
  weight,
  width,
  maxLines,
  style,
}: AppTextProps) {
  const Component: ElementType = as ?? 'span';
  const v = VARIANTS[variant];
  const effectiveAlign = align ?? v.defaultAlign;

  const inline: CSSProperties = {
    fontSize: `${v.fontSize}px`,
    fontWeight: weight ?? v.weight,
    lineHeight: `${v.lineHeight}px`,
    color: color ?? v.defaultColor,
    ...(v.letterSpacing !== undefined ? { letterSpacing: `${v.letterSpacing}px` } : {}),
    ...(width !== undefined ? { width, display: 'inline-block' } : {}),
    ...(maxLines !== undefined
      ? {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }
      : {}),
    ...style,
    display: "block"
  };

  return (
    <Component className={cn('font-sans', alignClass(effectiveAlign), className)} style={inline}>
      {children}
    </Component>
  );
}

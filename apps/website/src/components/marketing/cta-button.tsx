import Link from 'next/link';
import type { ReactNode } from 'react';

interface CtaButtonProps {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'ghost' | 'light';
  size?: 'md' | 'lg';
  external?: boolean;
}

/**
 * Marketing-grade button. Three variants on the brand palette:
 *   - `solid`  : violet background, white text. Primary CTAs. Mirrors
 *                customer-web's "Schedule call" button so the brand
 *                identity carries across product surfaces.
 *   - `ghost`  : 1px violet border, transparent. Secondary CTAs.
 *   - `light`  : paper background, violet text. Used on the dark
 *                For-Professionals invert where a violet-on-violet
 *                solid button would disappear.
 */
export function CtaButton({
  href,
  children,
  variant = 'solid',
  size = 'md',
  external = false,
}: CtaButtonProps) {
  const sizeClasses =
    size === 'lg'
      ? 'h-12 px-7 text-[14px] sm:h-14 sm:px-9 sm:text-[15px]'
      : 'h-10 px-5 text-[13px] sm:h-11 sm:px-6';
  const variantClasses =
    variant === 'solid'
      ? 'bg-accent text-white hover:opacity-90'
      : variant === 'light'
        ? 'bg-paper text-accent hover:bg-paper-elev'
        : 'border border-accent/30 bg-transparent text-accent hover:border-accent/60 hover:bg-accent/[0.04]';
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-colors ${sizeClasses} ${variantClasses}`}
    >
      {children}
    </Link>
  );
}

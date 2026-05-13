import type { ReactNode } from 'react';

/**
 * iPhone-style hardware frame with the punch-hole notch. The "screen"
 * area is whatever children pass in — typically a real `@ohlify/ui`
 * component so the marketing site shows the actual app, not stock
 * mockups.
 *
 * No SVG, no images: the frame is pure CSS in globals.css. That keeps
 * the LCP element on this page a text node + a few divs (no network
 * paint dependency).
 */
export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`phone-frame ${className ?? ''}`}>
      <div className="phone-screen">{children}</div>
    </div>
  );
}

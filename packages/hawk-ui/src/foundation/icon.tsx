import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * The icon wrapper.
 *
 * Components take a glyph *component* rather than a name string, so a typo is a
 * compile error and unused glyphs tree-shake out. The wrapper exists to pin
 * stroke width and sizing in one place: lucide's default 2px stroke reads heavy
 * against Mona Sans at small sizes, and 1.75 is the weight the specimens use.
 */
export interface HawkIconProps {
  icon: HawkIconComponent;
  /** Edge length in px. Defaults to 18. */
  size?: number;
  className?: string;
  /**
   * Accessible name.
   *
   * Omit for a decorative glyph sitting beside its own label — announcing
   * "phone, Call Adaeze" is worse than announcing "Call Adaeze".
   */
  label?: string;
  strokeWidth?: number;
}

export function HawkIcon({
  icon: Glyph,
  size = 18,
  className,
  label,
  strokeWidth = 1.75,
}: HawkIconProps) {
  return (
    <Glyph
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={cn('shrink-0', className)}
    />
  );
}

/**
 * The perforation — the one decorative device the system allows.
 *
 * A dashed rule with a notch punched from each end, so a Pass reads as card
 * stock that tears. Everything else in Hawk earns its place functionally; this
 * one is permitted because it is the metaphor the whole system is named for.
 *
 * The notches are painted in the ground colour, so the device only reads
 * correctly against the ground — which is the only place a pass ever sits.
 */
export function HawkPerforation({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('hawk-perforation my-hawk-5', className)} />;
}

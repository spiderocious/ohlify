import { clsx, type ClassValue } from 'clsx';

/**
 * Conditional className joiner for NativeWind classNames. RN styling has no
 * cascade/specificity conflicts to resolve the way tailwind-merge resolves
 * them for DOM class strings (see packages/ui/src/utils/cn.ts's web
 * equivalent), so this is clsx only — NativeWind resolves conflicting
 * utility classes itself at the last-one-wins position in the string.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

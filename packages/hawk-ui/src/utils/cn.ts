import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Tailwind-aware classname merger, taught about Hawk's scales.
 *
 * The stock `twMerge` does not know that `text-hawk-body` and `text-hawk-title`
 * are the same class group, nor that `text-hawk-ink` (a colour) is a *different*
 * group from `text-hawk-body` (a size). Without the extension it would either
 * fail to dedupe a font-size override or wrongly drop a colour that a caller
 * meant to keep.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'hawk-display-xl',
            'hawk-display-lg',
            'hawk-display',
            'hawk-title',
            'hawk-header',
            'hawk-body-title',
            'hawk-medium',
            'hawk-subheader',
            'hawk-body',
            'hawk-label',
            'hawk-caption',
            'hawk-overline',
            'hawk-tiny',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

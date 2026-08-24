import type { ReactNode } from 'react';

import type { HawkButtonSize } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * A button group — two or more actions that belong together.
 *
 * `stack` is not cosmetic. On the money surfaces the primary action often has a
 * long label ("Withdraw ₦120,000 to GTBank"), and a row layout would either
 * truncate it or shrink the secondary action below a comfortable target. The
 * caller picks; the group does not guess.
 */
export interface HawkButtonGroupProps {
  children: ReactNode;
  /** Stack vertically instead of laying out in a row. */
  stack?: boolean;
  /** Reverse order, so the primary sits left in a row / top in a stack. */
  primaryFirst?: boolean;
  className?: string;
}

export function HawkButtonGroup({
  children,
  stack = false,
  primaryFirst = false,
  className,
}: HawkButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex gap-hawk-4',
        stack ? 'flex-col' : 'flex-row items-center',
        primaryFirst && (stack ? 'flex-col-reverse' : 'flex-row-reverse'),
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The button dock — actions pinned to the bottom of a screen.
 *
 * Carries a top hairline and the paper background so content scrolling beneath
 * it does not appear to pass through the actions. On a form whose submit is
 * always reachable, that separation is the difference between "the page ended"
 * and "there is more below".
 */
export interface HawkButtonDockProps {
  children: ReactNode;
  /** Adds safe-area bottom padding for a mobile viewport. */
  safeArea?: boolean;
  className?: string;
}

export function HawkButtonDock({
  children,
  safeArea = false,
  className,
}: HawkButtonDockProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-hawk-sticky flex flex-col gap-hawk-4',
        'border-t border-hawk-line bg-hawk-paper p-hawk-pad',
        safeArea && 'pb-[calc(var(--hawk-s-6)+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSegment<T extends string> {
  value: T;
  label: string;
  icon?: HawkIconComponent;
  count?: number;
  disabled?: boolean;
}

export interface HawkSegmentedControlProps<T extends string> {
  segments: ReadonlyArray<HawkSegment<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: HawkButtonSize;
  /** Stretch each segment to equal width. */
  block?: boolean;
  className?: string;
  'aria-label'?: string;
}

const SEG_SIZE: Record<HawkButtonSize, string> = {
  sm: 'h-7 px-hawk-4 text-hawk-caption',
  md: 'h-9 px-hawk-5 text-hawk-label',
  lg: 'h-11 px-hawk-6 text-hawk-body',
};

/**
 * A segmented control — one choice from a small, fixed set.
 *
 * Implemented as a `tablist`, which is the accurate role: it switches which
 * content is shown rather than submitting anything. Arrow keys move between
 * segments, as a keyboard user expects from a tablist.
 */
export function HawkSegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
  block = false,
  className,
  'aria-label': ariaLabel,
}: HawkSegmentedControlProps<T>) {
  const move = (delta: number) => {
    const index = segments.findIndex((s) => s.value === value);
    if (index < 0) return;
    // Walk past disabled segments rather than landing on one.
    for (let step = 1; step <= segments.length; step += 1) {
      const next = segments[(index + delta * step + segments.length * step) % segments.length];
      if (next && !next.disabled) {
        onChange(next.value);
        return;
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
      }}
      className={cn(
        'inline-flex items-center gap-hawk-1 rounded-hawk-sm bg-hawk-sunken p-hawk-1',
        block && 'flex w-full',
        className,
      )}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={segment.disabled}
            onClick={() => onChange(segment.value)}
            className={cn(
              'hawk-focusable hawk-motion inline-flex items-center justify-center gap-hawk-3',
              'rounded-hawk-xs font-medium transition-colors duration-hawk-fast ease-hawk-standard',
              SEG_SIZE[size],
              block && 'flex-1',
              selected
                ? 'bg-hawk-paper text-hawk-ink-strong shadow-hawk-press'
                : 'text-hawk-ink-muted hover:text-hawk-ink',
              segment.disabled &&
                'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
            )}
          >
            {segment.icon && <HawkIcon icon={segment.icon} size={14} />}
            <span>{segment.label}</span>
            {segment.count !== undefined && (
              <span className="hawk-record tabular-nums text-hawk-ink-disabled">
                {segment.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

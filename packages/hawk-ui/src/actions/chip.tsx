import type { HawkChipSize } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import { IconClose } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * The filter chip.
 *
 * Distinct from a Badge, and the distinction is load-bearing: **a chip is
 * pressable and carries selection; a badge reports a status and is inert.**
 * The pre-Hawk app used one `AppTag` for both, which is why a status pill and a
 * filter looked identical while behaving completely differently.
 */
export interface HawkChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  /** Renders a dismiss affordance. */
  onRemove?: () => void;
  size?: HawkChipSize;
  icon?: HawkIconComponent;
  /** A count suffix — "Pending · 12". */
  count?: number;
  disabled?: boolean;
  className?: string;
}

const SIZE: Record<HawkChipSize, string> = {
  sm: 'h-7 px-hawk-4 text-hawk-caption gap-hawk-3',
  md: 'h-9 px-hawk-5 text-hawk-label gap-hawk-3',
};

const GLYPH: Record<HawkChipSize, number> = { sm: 12, md: 14 };

export function HawkChip({
  label,
  selected = false,
  onClick,
  onRemove,
  size = 'md',
  icon,
  count,
  disabled = false,
  className,
}: HawkChipProps) {
  const interactive = Boolean(onClick) && !disabled;
  const Tag = interactive ? 'button' : 'span';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-pressed={interactive ? selected : undefined}
      disabled={interactive && disabled ? true : undefined}
      className={cn(
        'hawk-focusable hawk-motion inline-flex select-none items-center rounded-hawk-pill',
        'border font-medium transition-colors duration-hawk-fast ease-hawk-standard',
        SIZE[size],
        selected
          ? 'border-hawk-acc bg-hawk-acc-soft text-hawk-acc-on-soft'
          : 'border-hawk-line bg-hawk-paper text-hawk-ink-muted',
        interactive && !selected && 'hover:border-hawk-acc-border hover:text-hawk-ink',
        interactive && 'active:scale-[0.97]',
        disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {icon && <HawkIcon icon={icon} size={GLYPH[size]} />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'hawk-record tabular-nums',
            selected ? 'text-hawk-acc' : 'text-hawk-ink-disabled',
          )}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${label}`}
          // Stops the removal from also toggling the chip's selection — the
          // dismiss sits inside the chip's own hit area.
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.stopPropagation();
              event.preventDefault();
              onRemove();
            }
          }}
          className="hawk-focusable -mr-1 inline-flex cursor-pointer items-center rounded-full p-0.5 hover:bg-hawk-pressed"
        >
          <HawkIcon icon={IconClose} size={GLYPH[size]} />
        </span>
      )}
    </Tag>
  );
}

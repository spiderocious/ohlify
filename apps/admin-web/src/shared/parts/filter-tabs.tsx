import { cn } from '@ohlify/ui';

export interface FilterTabOption {
  label: string;
  value: string;
}

interface FilterTabsProps {
  options: ReadonlyArray<FilterTabOption>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Optional aria-label for the tab group. */
  label?: string;
}

/**
 * Horizontal segmented tab control for primary list filters. Drop-in
 * replacement for a single-status dropdown — the table below it just
 * stays mounted and the rest of the page is unchanged.
 *
 * Visually mirrors @ohlify/ui's AppTabView pill style but is controlled
 * by string value (not index) so it composes cleanly with our cursor-
 * list filter state.
 */
export function FilterTabs({ options, value, onChange, className, label }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label ?? 'Filter'}
      className={cn(
        'flex w-full snap-x gap-1 overflow-x-auto rounded-[14px] bg-secondary p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value || '__all__'}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'snap-start whitespace-nowrap rounded-[10px] px-4 py-2 text-sm transition-all duration-150',
              isActive
                ? 'bg-surface font-bold text-text-primary shadow-[0_2px_8px_rgb(0_0_0_/_0.06)]'
                : 'font-medium text-text-muted hover:text-text-primary',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

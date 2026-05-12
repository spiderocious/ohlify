import { IconChevronDown } from '@icons';

import type { SortOption, SortKey, SortDirection } from '@ohlify/core';
import { AppText, DrawerService, cn } from '@ohlify/ui';

interface SortFilterProps {
  value: SortOption;
  onChange: (next: SortOption) => void;
  className?: string;
}

const KEY_LABELS: Record<SortKey, string> = {
  rating: 'Rating',
  price: 'Price',
  name: 'Name',
};

const DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: 'Ascending',
  desc: 'Descending',
};

/** Mirrors mobile SortFilter: two pill buttons that open bottom-sheet pickers. */
export function SortFilter({ value, onChange, className }: SortFilterProps) {
  const openKey = () => {
    DrawerService.showCustomModal(
      'Sort by',
      (close) => (
        <div className="space-y-2">
          {(['rating', 'price', 'name'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange({ ...value, key: k });
                close();
              }}
              className={cn(
                'w-full rounded-md border px-4 py-3 text-left font-sans text-sm font-medium',
                k === value.key
                  ? 'border-primary bg-surface-dark text-primary'
                  : 'border-border bg-background text-text-primary',
              )}
            >
              {KEY_LABELS[k]}
            </button>
          ))}
        </div>
      ),
      { position: 'bottom' },
    );
  };

  const openDirection = () => {
    DrawerService.showCustomModal(
      'Direction',
      (close) => (
        <div className="space-y-2">
          {(['desc', 'asc'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                onChange({ ...value, direction: d });
                close();
              }}
              className={cn(
                'w-full rounded-md border px-4 py-3 text-left font-sans text-sm font-medium',
                d === value.direction
                  ? 'border-primary bg-surface-dark text-primary'
                  : 'border-border bg-background text-text-primary',
              )}
            >
              {DIRECTION_LABELS[d]}
            </button>
          ))}
        </div>
      ),
      { position: 'bottom' },
    );
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Sort by
      </AppText>
      <button
        type="button"
        onClick={openKey}
        className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-2 font-sans text-sm font-semibold text-text-primary"
      >
        {KEY_LABELS[value.key]}
        <IconChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={openDirection}
        className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-2 font-sans text-sm font-semibold text-text-primary"
      >
        {DIRECTION_LABELS[value.direction]}
        <IconChevronDown size={14} />
      </button>
    </div>
  );
}

import { Repeat, Show } from 'meemaw';

import type { Professional } from '@ohlify/core';
import { AppEmptyState, ProfessionalListTile } from '@ohlify/ui';

interface SearchResultsListProps {
  professionals: ReadonlyArray<Professional>;
  onTap: (pro: Professional) => void;
  onSchedule: (pro: Professional) => void;
}

/** Mirrors mobile SearchResultsList. */
export function SearchResultsList({ professionals, onTap, onSchedule }: SearchResultsListProps) {
  return (
    <Show
      when={professionals.length > 0}
      fallback={<AppEmptyState message="No professionals match your search." />}
    >
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        <Repeat each={professionals as Professional[]}>
          {(p) => (
            <ProfessionalListTile
              key={p.id}
              name={p.name}
              role={p.role}
              rating={p.rating}
              reviewCount={p.reviewCount}
              imageKey={p.avatarKey}
              onTap={() => onTap(p)}
              onSchedule={() => onSchedule(p)}
            />
          )}
        </Repeat>
      </div>
    </Show>
  );
}

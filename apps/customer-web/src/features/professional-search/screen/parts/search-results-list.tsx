import { Repeat, Show } from 'meemaw';

import type { Professional } from '@ohlify/core';
import { AppEmptyState, ProfessionalListTile } from '@ohlify/ui';

import { usePrefetchProfessional } from '../../../../shared/prefetch/index.js';

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
          {(p) => <PrefetchableTile key={p.id} pro={p} onTap={onTap} onSchedule={onSchedule} />}
        </Repeat>
      </div>
    </Show>
  );
}

interface TileProps {
  pro: Professional;
  onTap: (pro: Professional) => void;
  onSchedule: (pro: Professional) => void;
}

function PrefetchableTile({ pro, onTap, onSchedule }: TileProps) {
  const prefetch = usePrefetchProfessional(pro.id);
  return (
    <div onMouseEnter={prefetch.onMouseEnter} onFocus={prefetch.onFocus}>
      <ProfessionalListTile
        name={pro.name}
        role={pro.role}
        rating={pro.rating}
        reviewCount={pro.reviewCount}
        imageKey={pro.avatarKey}
        onTap={() => onTap(pro)}
        onSchedule={() => onSchedule(pro)}
      />
    </div>
  );
}

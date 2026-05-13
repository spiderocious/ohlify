import { Repeat } from 'meemaw';

import type { Professional } from '@ohlify/core';
import { ProfessionalListTile, SectionHeader } from '@ohlify/ui';

import { usePrefetchProfessional } from '../../../../shared/prefetch/index.js';

interface PopularProfessionalsListProps {
  professionals: ReadonlyArray<Professional>;
  onViewAll: () => void;
  onTap: (pro: Professional) => void;
  onSchedule: (pro: Professional) => void;
}

/** Mirrors mobile/lib/features/home/screen/parts/popular_professionals_list.dart. */
export function PopularProfessionalsList({
  professionals,
  onViewAll,
  onTap,
  onSchedule,
}: PopularProfessionalsListProps) {
  return (
    <div>
      <SectionHeader title="Popular professionals" onViewAll={onViewAll} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <Repeat each={professionals as Professional[]}>
          {(p) => <PrefetchableTile key={p.id} pro={p} onTap={onTap} onSchedule={onSchedule} />}
        </Repeat>
      </div>
    </div>
  );
}

interface TileProps {
  pro: Professional;
  onTap: (pro: Professional) => void;
  onSchedule: (pro: Professional) => void;
}

// Per-tile wrapper so each row gets its own dedupe state — hovering tile A
// shouldn't suppress the prefetch when the user moves to tile B.
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

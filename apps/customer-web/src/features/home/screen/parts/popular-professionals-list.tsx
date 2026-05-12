import { Repeat } from 'meemaw';

import type { Professional } from '@ohlify/core';
import { ProfessionalListTile, SectionHeader } from '@ohlify/ui';

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
    </div>
  );
}

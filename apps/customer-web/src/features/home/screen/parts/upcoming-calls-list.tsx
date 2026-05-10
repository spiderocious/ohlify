import { Repeat } from 'meemaw';

import type { UpcomingCall } from '@ohlify/core';
import { SectionHeader, UpcomingCallCard } from '@ohlify/ui';

interface UpcomingCallsListProps {
  calls: ReadonlyArray<UpcomingCall>;
  onViewAll: () => void;
  onTap: (call: UpcomingCall) => void;
}

/** Mirrors mobile/lib/features/home/screen/parts/upcoming_calls_list.dart. */
export function UpcomingCallsList({ calls, onViewAll, onTap }: UpcomingCallsListProps) {
  if(calls.length === 0) return null;
  return (
    <div>
      <SectionHeader title="Upcoming calls" onViewAll={onViewAll} />
      <div
        className="mt-3 flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <Repeat each={calls as UpcomingCall[]}>
          {(c) => (
            <div key={c.id} className="shrink-0">
              <UpcomingCallCard
                name={c.name}
                role={c.role}
                rating={c.rating}
                reviewCount={c.reviewCount}
                imageKey={c.avatarKey}
                onTap={() => onTap(c)}
              />
            </div>
          )}
        </Repeat>
      </div>
    </div>
  );
}

import { IconPhone, IconUser, IconVideo } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { CallType } from '@ohlify/core';
import { AppEmptyState, AppText } from '@ohlify/ui';

export interface AllCallItem {
  id: string;
  name: string;
  callType: CallType;
  time: string;
  /** Free-form display state, e.g. "Scheduled", "Completed", "Cancelled". */
  stateLabel: string;
  /** Pre-formatted amount, e.g. "₦20,000.00". */
  amount: string;
}

export interface AllCallGroup {
  date: string;
  calls: AllCallItem[];
}

interface AllCallsListProps {
  groups: ReadonlyArray<AllCallGroup>;
  onTap: (call: AllCallItem) => void;
}

export function AllCallsList({ groups, onTap }: AllCallsListProps) {
  return (
    <Show when={groups.length > 0} fallback={<AppEmptyState message="No calls yet." />}>
      <div className="space-y-5">
        <Repeat each={groups as AllCallGroup[]}>
          {(g) => (
            <div key={g.date}>
              <AppText
                variant="bodyNormal"
                align="start"
                color="var(--ohl-text-muted)"
                weight={600}
              >
                {g.date}
              </AppText>
              <div className="mt-2 space-y-2">
                <Repeat each={g.calls}>
                  {(c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onTap(c)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-background p-3 text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                        <IconUser size={18} color="var(--ohl-text-muted)" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <AppText variant="body" weight={600} align="start" maxLines={1}>
                          {c.name}
                        </AppText>
                        <AppText
                          variant="bodyNormal"
                          align="start"
                          color="var(--ohl-text-muted)"
                          maxLines={1}
                          className="mt-0.5"
                        >
                          {c.time} · {c.stateLabel}
                        </AppText>
                      </div>
                      <span className="text-text-muted">
                        {c.callType === 'video' ? (
                          <IconVideo size={16} />
                        ) : (
                          <IconPhone size={16} />
                        )}
                      </span>
                      <AppText
                        variant="bodyNormal"
                        align="end"
                        weight={600}
                        color="var(--ohl-text-jet)"
                      >
                        {c.amount}
                      </AppText>
                    </button>
                  )}
                </Repeat>
              </div>
            </div>
          )}
        </Repeat>
      </div>
    </Show>
  );
}

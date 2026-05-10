import { IconPhone, IconVideo } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { CompletedCallItem } from '@ohlify/core';
import { AppEmptyState, AppText } from '@ohlify/ui';

/** Mirrors mobile/lib/features/call_details/screen/parts/call_history_section.dart. */
export function CallHistorySection({ history }: { history: ReadonlyArray<CompletedCallItem> }) {
  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        History with this professional
      </AppText>
      <Show when={history.length > 0} fallback={<AppEmptyState message="No prior calls." />}>
        <div className="mt-2.5 space-y-2">
          <Repeat each={history as CompletedCallItem[]}>
            {(c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl bg-background p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface text-text-muted">
                  {c.callType === 'video' ? <IconVideo size={16} /> : <IconPhone size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <AppText variant="body" weight={600} align="start" maxLines={1}>
                    {c.name}
                  </AppText>
                  <AppText
                    variant="bodyNormal"
                    align="start"
                    color="var(--ohl-text-muted)"
                    className="mt-0.5"
                  >
                    {c.time} · {c.duration}
                  </AppText>
                </div>
                <AppText variant="body" weight={700} align="end">
                  {c.amount}
                </AppText>
              </div>
            )}
          </Repeat>
        </div>
      </Show>
    </div>
  );
}

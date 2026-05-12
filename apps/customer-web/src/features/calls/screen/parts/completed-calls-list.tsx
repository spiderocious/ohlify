import { IconPhone, IconVideo } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { CompletedCallGroup, CompletedCallItem } from '@ohlify/core';
import { AppEmptyState, AppFilePreview, AppText } from '@ohlify/ui';

interface CompletedCallsListProps {
  groups: ReadonlyArray<CompletedCallGroup>;
  onTap: (call: CompletedCallItem) => void;
  /** Empty-state message override. */
  emptyMessage?: string;
}

/** Mirrors mobile/lib/features/calls/screen/parts/completed_calls_list.dart. */
export function CompletedCallsList({
  groups,
  onTap,
  emptyMessage = 'No completed calls yet.',
}: CompletedCallsListProps) {
  return (
    <Show when={groups.length > 0} fallback={<AppEmptyState message={emptyMessage} />}>
      <div className="space-y-5">
        <Repeat each={groups as CompletedCallGroup[]}>
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
                <Repeat each={g.calls as CompletedCallItem[]}>
                  {(c) => {
                    const isVideo = c.callType === 'video';
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onTap(c)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-background p-3 text-left transition hover:bg-surface-light"
                      >
                        <AppFilePreview
                          fileKey={c.avatarKey ?? null}
                          kind="image"
                          width={40}
                          height={40}
                          radius={20}
                          alt={c.name}
                          fallback={
                            isVideo ? (
                              <IconVideo size={18} color="var(--ohl-text-muted)" />
                            ) : (
                              <IconPhone size={18} color="var(--ohl-text-muted)" />
                            )
                          }
                        />
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
                            {c.stateLabel ? `${c.stateLabel} · ` : ''}
                            {c.time} · {c.duration}
                          </AppText>
                        </div>
                        <span className="text-text-muted">
                          {isVideo ? <IconVideo size={16} /> : <IconPhone size={16} />}
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
                    );
                  }}
                </Repeat>
              </div>
            </div>
          )}
        </Repeat>
      </div>
    </Show>
  );
}

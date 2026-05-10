import { IconClock, IconPhone, IconUser, IconVideo } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { ScheduledCallItem } from '@ohlify/core';
import { AppButton, AppEmptyState, AppText } from '@ohlify/ui';

interface ScheduledCallsListProps {
  calls: ReadonlyArray<ScheduledCallItem>;
  onCancel: (call: ScheduledCallItem) => void;
  onReschedule: (call: ScheduledCallItem) => void;
  onJoin: (call: ScheduledCallItem) => void;
  onTap: (call: ScheduledCallItem) => void;
}

/** Mirrors mobile/lib/features/calls/screen/parts/scheduled_calls_list.dart. */
export function ScheduledCallsList({
  calls,
  onCancel,
  onReschedule,
  onJoin,
  onTap,
}: ScheduledCallsListProps) {
  return (
    <Show when={calls.length > 0} fallback={<AppEmptyState message="No scheduled calls." />}>
      <div className="space-y-3">
        <Repeat each={calls as ScheduledCallItem[]}>
          {(c) => <ScheduledCallCard
            key={c.id}
            call={c}
            onCancel={() => onCancel(c)}
            onReschedule={() => onReschedule(c)}
            onJoin={() => onJoin(c)}
            onTap={() => onTap(c)}
          />}
        </Repeat>
      </div>
    </Show>
  );
}

interface CardProps {
  call: ScheduledCallItem;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
  onTap: () => void;
}

function ScheduledCallCard({ call, onCancel, onReschedule, onJoin, onTap }: CardProps) {
  console.log('rendering card for call', call);
  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full rounded-2xl bg-background p-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
          <IconUser size={22} color="var(--ohl-text-muted)" />
        </div>
        <div className="min-w-0 flex-1">
          <AppText variant="body" weight={600} align="start" maxLines={1}>
            {call.name}
          </AppText>
          <AppText
            variant="bodyNormal"
            align="start"
            color="var(--ohl-text-muted)"
            maxLines={1}
            className="mt-0.5"
          >
            {call.role}
          </AppText>
        </div>
        <span className="rounded-pill bg-surface-light px-2.5 py-1.5 text-text-jet">
          {call.callType === 'video' ? <IconVideo size={14} /> : <IconPhone size={14} />}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <IconClock size={14} />
          <span className="font-sans text-xs">{call.time}</span>
        </span>
        <span className="font-sans text-xs">·</span>
        <span className="font-sans text-xs">{call.date}</span>
        <span className="font-sans text-xs">·</span>
        <span className="font-sans text-xs">{call.duration}</span>
      </div>
      <div
        className="mt-4 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <Show when={call.canReschedule}>
          <AppButton label="Reschedule" variant="outline" radius={100} onPressed={onReschedule} />
          <AppButton label="Cancel" variant="outline" radius={100} onPressed={onCancel} />
        </Show>
        <Show when={!call.canReschedule}>
          <AppButton label="Join call" radius={100} onPressed={onJoin} />
        </Show>
      </div>
    </button>
  );
}

import { IconCalendar, IconClock, IconPhone, IconVideo } from '@icons';
import { Show } from 'meemaw';

import type { CallDetail } from '@ohlify/core';
import { AppText } from '@ohlify/ui';

/** Mirrors mobile/lib/features/call_details/screen/parts/call_info_card.dart. */
export function CallInfoCard({ call }: { call: CallDetail }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <Row icon={<IconCalendar size={16} />} label="Date" value={call.date} />
      <Row icon={<IconClock size={16} />} label="Time" value={`${call.time} · ${call.duration}`} />
      <Row
        icon={call.callType === 'video' ? <IconVideo size={16} /> : <IconPhone size={16} />}
        label="Type"
        value={call.callType === 'video' ? 'Video call' : 'Audio call'}
      />
      <Show when={Boolean(call.amount)}>
        <Row label="Amount" value={call.amount ?? ''} />
      </Show>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Show when={Boolean(icon)}>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-dark text-primary">
          {icon}
        </span>
      </Show>
      <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)" className="flex-1">
        {label}
      </AppText>
      <AppText variant="body" weight={600} align="end" color="var(--ohl-text-jet)">
        {value}
      </AppText>
    </div>
  );
}

import { Show } from 'meemaw';

import type { CallDetail } from '@ohlify/core';
import { AppButton } from '@ohlify/ui';

interface CallActionButtonsProps {
  call: CallDetail;
  onJoin: () => void;
  onReschedule: () => void;
  onScheduleAnother: () => void;
  onViewProfile: () => void;
}

/** Mirrors mobile/lib/features/call_details/screen/parts/call_action_buttons.dart. */
export function CallActionButtons({
  call,
  onJoin,
  onReschedule,
  onScheduleAnother,
  onViewProfile,
}: CallActionButtonsProps) {
  if (call.status === 'completed') {
    return (
      <div className="space-y-2.5">
        <AppButton
          label="Schedule another call"
          expanded
          radius={100}
          onPressed={onScheduleAnother}
        />
        <AppButton
          label="View professional"
          variant="outline"
          expanded
          radius={100}
          onPressed={onViewProfile}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <Show when={call.canJoin}>
        <AppButton label="Join call" expanded radius={100} onPressed={onJoin} />
      </Show>
      <Show when={call.canReschedule}>
        <AppButton
          label="Reschedule"
          variant="outline"
          expanded
          radius={100}
          onPressed={onReschedule}
        />
      </Show>
    </div>
  );
}

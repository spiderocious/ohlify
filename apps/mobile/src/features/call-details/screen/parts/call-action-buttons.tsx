import { AppButton } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import type { CallDetail } from '@shared/types/call-detail';

export interface CallActionButtonsProps {
  call: CallDetail;
  onJoin: () => void;
  onReschedule: () => void;
  onScheduleAnother: () => void;
  onViewProfile: () => void;
}

/** Mirrors mobile/lib/features/call_details/screen/parts/call_action_buttons.dart. */
export function CallActionButtons({ call, onJoin, onReschedule, onScheduleAnother, onViewProfile }: CallActionButtonsProps) {
  return (
    <View>
      <PrimaryButtons call={call} onJoin={onJoin} onReschedule={onReschedule} onScheduleAnother={onScheduleAnother} />
      <View style={{ height: 10 }} />
      <AppButton label="View full profile" variant="outline" onPress={onViewProfile} radius={100} height={52} />
    </View>
  );
}

function PrimaryButtons({
  call,
  onJoin,
  onReschedule,
  onScheduleAnother,
}: {
  call: CallDetail;
  onJoin: () => void;
  onReschedule: () => void;
  onScheduleAnother: () => void;
}) {
  if (call.status === 'upcoming' && call.canJoin) {
    return <AppButton label="Join call" onPress={onJoin} radius={100} height={52} />;
  }
  if (call.status === 'upcoming' && call.canReschedule) {
    return (
      <View>
        <AppButton label="Reschedule" onPress={onReschedule} radius={100} height={52} />
        <View style={{ height: 10 }} />
        <AppButton label="Schedule another call" variant="subtle" onPress={onScheduleAnother} radius={100} height={52} />
      </View>
    );
  }
  return <AppButton label="Schedule another call" onPress={onScheduleAnother} radius={100} height={52} />;
}

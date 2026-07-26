import { formatSecondsAsDuration } from '@ohlify/core';
import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import type { CallEvent } from '../../types/chat-models';

const OUTCOME_LABELS: Record<string, string> = {
  completed: 'Call',
  missed: 'Missed call',
  declined: 'Call declined',
  cancelled: 'Call cancelled',
};

/**
 * A call, rendered inside the conversation.
 *
 * Centred rather than sided: the system wrote this, not either party, and a
 * left/right bubble would imply someone said it. Missed and declined are tinted
 * red because they are the ones people scan a thread looking for.
 */
export function CallEventBubble({
  event,
  timeLabel,
  mine,
}: {
  event: CallEvent;
  timeLabel: string;
  mine: boolean;
}) {
  const isNegative = event.outcome === 'missed' || event.outcome === 'declined';
  const tint = isNegative ? colors.error : colors.textSlate;

  const direction = mine ? 'Outgoing' : 'Incoming';
  const label = OUTCOME_LABELS[event.outcome] ?? 'Call';
  const detail =
    event.outcome === 'completed' && event.seconds !== undefined && event.seconds > 0
      ? formatSecondsAsDuration(event.seconds)
      : undefined;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <AppIcon
          name={event.callType === 'video' ? 'video' : 'phone'}
          size={15}
          color={tint}
        />
        <View style={{ width: 7 }} />
        <AppText variant="bodySmall" weight="600" color={tint}>
          {`${direction} · ${label}`}
        </AppText>
        {detail ? (
          <AppText variant="bodySmall" color={colors.textMuted}>
            {` · ${detail}`}
          </AppText>
        ) : null}
        <AppText variant="bodySmall" color={colors.textMuted}>
          {` · ${timeLabel}`}
        </AppText>
      </View>
    </View>
  );
}

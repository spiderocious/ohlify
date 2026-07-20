import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { ChatMessage } from '../../types/chat-models';

export interface ScheduleCardProps {
  message: ChatMessage;
  /** 'accept' | 'decline' | 'cancel'. */
  onAction: (action: string) => void;
  onReschedule: () => void;
  onJoin: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting response',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

/**
 * A chat-native scheduled call card. Either party can propose; the invitee
 * sees Accept/Decline; the proposer sees Reschedule/Cancel inline. Mirrors
 * mobile/lib/features/chat/screen/parts/schedule_card.dart (RN has no
 * PopupMenuButton equivalent, so the overflow menu becomes two inline
 * icon buttons instead of a dropdown).
 */
export function ScheduleCard({ message, onAction, onReschedule, onJoin }: ScheduleCardProps) {
  const { width } = useWindowDimensions();
  const status = message.scheduleStatus ?? 'pending';
  const accepted = status === 'accepted';
  const hasInvite = message.canAccept || message.canDecline;

  return (
    <View style={{ alignItems: message.mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          marginBottom: 8,
          padding: 14,
          maxWidth: width * 0.85,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" color={colors.textMuted} align="left">
              📅 Scheduled call
            </AppText>
            <AppText variant="body" weight="700" color={colors.textJet} align="left">
              {formatWhen(message.scheduledAt)}
            </AppText>
            {message.body ? (
              <AppText variant="bodySmall" color={colors.textMuted} align="left">
                {message.body}
              </AppText>
            ) : null}
          </View>
          {message.canReschedule ? (
            <Pressable onPress={onReschedule} style={{ padding: 4 }}>
              <AppIcon name="clock" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
          {message.canCancel ? (
            <Pressable onPress={() => onAction('cancel')} style={{ padding: 4 }}>
              <AppIcon name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ height: 6 }} />
        <AppText variant="bodySmall" color={accepted ? colors.success : colors.textMuted} align="left">
          {STATUS_LABELS[status] ?? status}
        </AppText>
        {hasInvite ? (
          <>
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row' }}>
              {message.canAccept ? (
                <View style={{ flex: 1 }}>
                  <AppButton label="Accept" radius={100} height={38} onPress={() => onAction('accept')} />
                </View>
              ) : null}
              {message.canAccept && message.canDecline ? <View style={{ width: 8 }} /> : null}
              {message.canDecline ? (
                <View style={{ flex: 1 }}>
                  <AppButton label="Decline" radius={100} height={38} variant="outline" onPress={() => onAction('decline')} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
        {accepted ? (
          <>
            <View style={{ height: 12 }} />
            <AppButton label="Join call" radius={100} height={38} expanded onPress={onJoin} />
          </>
        ) : null}
      </View>
    </View>
  );
}

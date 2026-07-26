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

const STATUS = {
  pending: { label: 'Awaiting response', color: colors.warning, bg: '#FFF7ED' },
  accepted: { label: 'Accepted', color: colors.success, bg: '#DCFCE7' },
  declined: { label: 'Declined', color: colors.danger, bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceDark },
} as const;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: WEEKDAYS[d.getDay()]!,
    day: d.getDate(),
    month: MONTHS[d.getMonth()]!,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

/**
 * A chat-native scheduled-call card — a bold date block, a status pill, and
 * contextual actions (accept/decline for the invitee; reschedule/cancel for
 * the proposer; join when accepted). Mirrors
 * mobile/lib/features/chat/screen/parts/schedule_card.dart.
 */
export function ScheduleCard({ message, onAction, onReschedule, onJoin }: ScheduleCardProps) {
  const { width } = useWindowDimensions();
  const statusKey = (message.scheduleStatus ?? 'pending') as keyof typeof STATUS;
  const status = STATUS[statusKey] ?? STATUS.pending;
  const accepted = statusKey === 'accepted';
  const hasInvite = message.canAccept || message.canDecline;
  const when = parts(message.scheduledAt);

  return (
    // paddingHorizontal mirrors MessageBubble's tail inset so cards share the
    // same edge as the bubbles.
    <View style={{ alignItems: message.mine ? 'flex-end' : 'flex-start', marginBottom: 12, paddingHorizontal: 8 }}>
      <View
        style={{
          maxWidth: width * 0.82,
          width: width * 0.72,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        {/* Header strip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceDark }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="event" size={15} color={colors.textWhite} />
          </View>
          <View style={{ width: 8 }} />
          <AppText variant="bodySmall" weight="700" color={colors.textJet} align="left">
            Scheduled call
          </AppText>
          <View style={{ flex: 1 }} />
          {message.canReschedule ? (
            <Pressable onPress={onReschedule} hitSlop={8} style={{ padding: 4 }}>
              <AppIcon name="clock" size={17} color={colors.textMuted} />
            </Pressable>
          ) : null}
          {message.canCancel ? (
            <Pressable onPress={() => onAction('cancel')} hitSlop={8} style={{ padding: 4, marginLeft: 2 }}>
              <AppIcon name="close" size={17} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Body */}
        <View style={{ padding: 14 }}>
          {when ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 54,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="bodySmallest" weight="700" color="rgba(255,255,255,0.85)">
                  {when.month.toUpperCase()}
                </AppText>
                <AppText variant="medium" weight="800" color={colors.textWhite}>
                  {String(when.day)}
                </AppText>
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="700" color={colors.textJet} align="left">
                  {when.weekday}
                </AppText>
                <View style={{ height: 2 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="clock" size={14} color={colors.textMuted} />
                  <View style={{ width: 5 }} />
                  <AppText variant="bodySmall" weight="600" color={colors.textMuted} align="left">
                    {when.time}
                  </AppText>
                </View>
              </View>
            </View>
          ) : null}

          {message.body ? (
            <>
              <View style={{ height: 10 }} />
              <AppText variant="bodySmall" color={colors.textMuted} align="left">
                {message.body}
              </AppText>
            </>
          ) : null}

          <View style={{ height: 12 }} />
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: status.bg }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.color }} />
            <View style={{ width: 6 }} />
            <AppText variant="bodySmallest" weight="700" color={status.color}>
              {status.label}
            </AppText>
          </View>

          {hasInvite ? (
            <>
              <View style={{ height: 14 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {message.canAccept ? (
                  <View style={{ flex: 1 }}>
                    <AppButton label="Accept" radius={100} height={40} onPress={() => onAction('accept')} />
                  </View>
                ) : null}
                {message.canDecline ? (
                  <View style={{ flex: 1 }}>
                    <AppButton label="Decline" radius={100} height={40} variant="outline" onPress={() => onAction('decline')} />
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {accepted ? (
            <>
              <View style={{ height: 14 }} />
              <AppButton label="Join call" radius={100} height={40} expanded startIcon={<AppIcon name="phone" size={16} color={colors.textWhite} />} onPress={onJoin} />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

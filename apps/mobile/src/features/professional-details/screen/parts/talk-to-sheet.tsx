import { CallType, formatSecondsAsDuration } from '@ohlify/core';
import { AppButton, AppIcon, AppText, colors, showCustomModal } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

export interface TalkToOption {
  callType: CallType;
  perMinuteLabel: string;
  secondsHeld: number;
}

export interface TalkToSheetProps {
  options: TalkToOption[];
  onCall: (callType: CallType) => void;
  onMessage: () => void;
}

const CALL_TYPE_COPY = {
  [CallType.AUDIO]: { title: 'Voice call', icon: 'phone' },
  [CallType.VIDEO]: { title: 'Video call', icon: 'video' },
} as const;

/**
 * One decision, made in the open.
 *
 * The screen previously offered "Message" and "Call" side by side and picked
 * video silently whenever the professional offered it — so a user tapping
 * "Call" could land in a video call they never chose, at a rate they never saw.
 * Here every option carries its own per-minute price, and the choice is theirs.
 */
export function showTalkToSheet(firstName: string, props: TalkToSheetProps) {
  showCustomModal(`Talk to ${firstName}`, (dismiss) => (
    <TalkToSheetBody
      {...props}
      onCall={(callType) => {
        dismiss();
        props.onCall(callType);
      }}
      onMessage={() => {
        dismiss();
        props.onMessage();
      }}
    />
  ));
}

function TalkToSheetBody({ options, onCall, onMessage }: TalkToSheetProps) {
  return (
    <View>
      {options.map((option) => {
        const copy = CALL_TYPE_COPY[option.callType];
        return (
          <Pressable key={option.callType} onPress={() => onCall(option.callType)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                marginBottom: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${colors.primary}14`,
                }}
              >
                <AppIcon name={copy.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600" color={colors.textJet} align="left">
                  {copy.title}
                </AppText>
                {/* Time already bought reads as "you can start now"; the price
                    only matters to someone who still has to buy. */}
                {option.secondsHeld > 0 ? (
                  <AppText variant="bodySmall" weight="600" color={colors.success} align="left">
                    {`${formatSecondsAsDuration(option.secondsHeld)} left`}
                  </AppText>
                ) : (
                  <AppText variant="bodySmall" color={colors.textMuted} align="left">
                    {option.perMinuteLabel}
                  </AppText>
                )}
              </View>
              <AppIcon name="chevronRight" size={16} color={colors.textMuted} />
            </View>
          </Pressable>
        );
      })}

      <View style={{ height: 4 }} />
      {/* Messaging last and quieter: it is the fallback for "not right now",
          not the thing the sheet is for. */}
      <AppButton
        label="Send a message instead"
        onPress={onMessage}
        radius={100}
        height={50}
        variant="outline"
        expanded
      />
    </View>
  );
}

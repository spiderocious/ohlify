import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export interface InviteApprovalOverlayProps {
  inviterName: string;
  inviteeName: string;
  /** Seconds left before the invite auto-declines. Counts down while this shows. */
  secondsRemaining: number;
  isSubmitting: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

/**
 * Asks the professional whether a third person may enter their room.
 *
 * Delivered over SSE to the shell and rendered here rather than inside the
 * call-app: authorization must not be a claim the call client makes about
 * itself. This overlay only collects the answer — the server decides what it
 * means.
 *
 * The countdown is shown because the invite auto-declines on expiry, and a
 * prompt that vanishes without explanation reads as a bug.
 */
export function InviteApprovalOverlay({
  inviterName,
  inviteeName,
  secondsRemaining,
  isSubmitting,
  onApprove,
  onDecline,
}: InviteApprovalOverlayProps) {
  const [remaining, setRemaining] = useState(secondsRemaining);

  useEffect(() => {
    setRemaining(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(12,12,20,0.86)',
        paddingHorizontal: 28,
      }}
    >
      <View
        style={{
          width: '100%',
          padding: 24,
          borderRadius: 24,
          backgroundColor: colors.background,
        }}
      >
        <AppText variant="bodyTitle" weight="700" color={colors.textJet} align="center">
          Add someone to this call?
        </AppText>
        <View style={{ height: 10 }} />
        <AppText variant="body" color={colors.textMuted} align="center">
          {`${inviterName} wants to add ${inviteeName} to this call.`}
        </AppText>
        <View style={{ height: 6 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="center">
          {remaining > 0
            ? `Declines automatically in ${remaining}s`
            : 'This invite has expired.'}
        </AppText>

        <View style={{ height: 20 }} />
        <AppButton
          label="Allow"
          radius={100}
          height={50}
          expanded
          isDisabled={isSubmitting || remaining <= 0}
          onPress={onApprove}
        />
        <View style={{ height: 10 }} />
        <AppButton
          label="Decline"
          variant="outline"
          radius={100}
          height={50}
          expanded
          isDisabled={isSubmitting}
          onPress={onDecline}
        />
      </View>
    </View>
  );
}

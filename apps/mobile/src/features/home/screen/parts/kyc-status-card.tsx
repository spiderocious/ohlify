import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface KycStatusCardProps {
  status: string;
  rejectReason?: string;
  onFix: () => void;
}

/**
 * Shown only while verification is unfinished.
 *
 * An approved professional should never see this — a permanent "you're
 * verified" card is clutter on the screen they look at every day. Rejection
 * carries the reason, because "we couldn't verify you" with no explanation
 * leaves someone with nothing to act on.
 */
export function KycStatusCard({ status, rejectReason, onFix }: KycStatusCardProps) {
  const rejected = status === 'rejected';
  const tint = rejected ? colors.error : colors.warning;

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: `${tint}14`,
        borderWidth: 1,
        borderColor: `${tint}33`,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppIcon name={rejected ? 'error' : 'clock'} size={18} color={tint} />
        <View style={{ width: 8 }} />
        <AppText variant="body" weight="700" color={colors.textJet} align="left">
          {rejected ? 'Verification failed' : 'Verification in review'}
        </AppText>
      </View>
      <View style={{ height: 6 }} />
      <AppText variant="bodySmall" color={colors.textMuted} align="left">
        {rejected
          ? (rejectReason ?? 'Something on your submission needs fixing.')
          : 'We’re checking your details. You can’t take paid calls until this clears.'}
      </AppText>
      {rejected ? (
        <>
          <View style={{ height: 12 }} />
          <AppButton label="Fix and resubmit" radius={100} height={38} onPress={onFix} />
        </>
      ) : null}
    </View>
  );
}

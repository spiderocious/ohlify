import { IntentNeed, type IntentRequirement } from '@ohlify/core';
import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PurchaseIntentFlow } from '@features/intents/screen/purchase-intent-flow';

/** Talk time a top-up buys at minimum — enough to be worth resuming the call for. */
const TOP_UP_TARGET_SECONDS = 300;

export interface OutOfMinutesOverlayProps {
  professionalId: string;
  callType: 'audio' | 'video';
  /** Seconds left before the call ends on its own. Counts down while this shows. */
  secondsUntilEnd: number;
  onResume: () => void;
  onFundWallet: () => void;
  onEndCall: () => void;
}

/**
 * Covers the call when the caller's prepaid time runs out.
 *
 * Both mics are already closed by this point, so the overlay has to carry the
 * whole explanation — and it shows the countdown to the call ending, because a
 * silent screen that hangs up on its own reads as a crash.
 *
 * Buying here does not gate on the call surviving: the purchase flow owns its
 * own lifecycle, so time bought after the call dies is still time bought.
 */
export function OutOfMinutesOverlay({
  professionalId,
  callType,
  secondsUntilEnd,
  onResume,
  onFundWallet,
  onEndCall,
}: OutOfMinutesOverlayProps) {
  const [isBuying, setIsBuying] = useState(false);

  const requirement = useMemo<IntentRequirement>(
    () => ({
      need: IntentNeed.MINUTES,
      professional_id: professionalId,
      call_type: callType,
      minimum_seconds: TOP_UP_TARGET_SECONDS,
    }),
    [professionalId, callType],
  );

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 32,
      }}
    >
      <View style={{ backgroundColor: colors.surfaceLight, borderRadius: 24, padding: 20 }}>
        <AppText variant="header" weight="700" color={colors.textJet} align="left">
          You're out of minutes
        </AppText>
        <View style={{ height: 4 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          {secondsUntilEnd > 0
            ? `Both mics are muted. Top up within ${secondsUntilEnd}s to carry on.`
            : 'Both mics are muted while you top up.'}
        </AppText>
        <View style={{ height: 18 }} />

        {isBuying ? (
          <PurchaseIntentFlow
            requirement={requirement}
            onSatisfied={onResume}
            onFundWallet={onFundWallet}
            onAbandon={() => setIsBuying(false)}
          />
        ) : (
          <>
            <AppButton label="Buy minutes" expanded radius={100} onPress={() => setIsBuying(true)} />
            <View style={{ height: 10 }} />
            <AppButton label="End call" expanded radius={100} variant="outline" onPress={onEndCall} />
          </>
        )}
      </View>
    </View>
  );
}

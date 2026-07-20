import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppText, colors, showCustomModal, showToast } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../../app.navigation';
import { chatApi } from '@features/chat/api/chat-api';
import { minutesApi } from '@features/minutes/api/minutes-api';
import type { ProfessionalRate } from '@features/professionals/types/professional-rate';
import { BuyMinutesForm } from './buy-minutes-form';

export interface BuyMinutesSectionProps {
  professionalId: string;
  rates: ProfessionalRate[];
}

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Per-call-type minutes balance with a pro, plus a wallet-funded top-up.
 * Fetches its own balance so the parent details screen stays thin. Mirrors
 * mobile/lib/features/professional_details/screen/parts/buy_minutes_section.dart.
 */
export function BuyMinutesSection({ professionalId, rates }: BuyMinutesSectionProps) {
  const hasAudio = rates.some((r) => r.callType === 'audio');
  const hasVideo = rates.some((r) => r.callType === 'video');
  if (!hasAudio && !hasVideo) return null;

  const audioRate = rates.find((r) => r.callType === 'audio');
  const videoRate = rates.find((r) => r.callType === 'video');

  return (
    <View>
      <AppText variant="header" color={colors.textJet} weight="700" align="left">
        Minutes
      </AppText>
      <View style={{ height: 10 }} />
      <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16 }}>
        {hasAudio && audioRate ? <MinuteRow professionalId={professionalId} callType="audio" rate={audioRate} /> : null}
        {hasAudio && hasVideo ? <View style={{ height: 12 }} /> : null}
        {hasVideo && videoRate ? <MinuteRow professionalId={professionalId} callType="video" rate={videoRate} /> : null}
      </View>
    </View>
  );
}

function perMinuteKobo(rate: ProfessionalRate): number {
  const digits = rate.price.replace(/[^0-9.]/g, '');
  const naira = Number(digits) || 0;
  const priceKobo = Math.round(naira * 100);
  if (rate.durationMinutes <= 0) return 0;
  return Math.floor(priceKobo / rate.durationMinutes);
}

function MinuteRow({ professionalId, callType, rate }: { professionalId: string; callType: 'audio' | 'video'; rate: ProfessionalRate }) {
  const navigation = useNavigation<RootNavigation>();
  const [minutes, setMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    minutesApi
      .balanceForPro(professionalId, callType)
      .then((b) => {
        if (!cancelled) setMinutes(b.minutesRemaining);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [professionalId, callType]);

  async function goToChat() {
    try {
      const conversationId = await chatApi.openConversation(professionalId);
      navigation.navigate('Home', { screen: 'ChatsTab', params: { screen: 'ChatThread', params: { conversationId } } });
    } catch {
      // Non-fatal — the purchase succeeded; stay on the details page.
    }
  }

  async function buy(amountKobo: number) {
    try {
      const res = await minutesApi.buyMinutes({ professionalId, callType, amountKobo });
      setMinutes(res.minutesRemaining);
      showToast(`Added ${res.minutesPurchased} minutes.`, { type: 'success' });
      await goToChat();
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      const msg = error.reason === 'insufficient_balance' ? 'Your wallet balance is too low. Fund your wallet and try again.' : apiErrorMessage(error);
      showToast(msg, { type: 'error' });
    }
  }

  function openBuy() {
    const perMin = perMinuteKobo(rate);
    let amount = '';
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      `Buy ${callType} minutes`,
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <BuyMinutesForm
            perMinuteKobo={perMin}
            onChanged={(v) => {
              amount = v;
            }}
            onConfirm={() => {
              const clean = amount.replace(/[^0-9.]/g, '');
              const naira = Number(clean) || 0;
              const kobo = Math.round(naira * 100);
              if (kobo <= 0) {
                showToast('Enter a valid amount.', { type: 'error' });
                return;
              }
              dismiss();
              buy(kobo);
            }}
          />
        );
      },
      { position: 'bottom' },
    );
    void handle;
  }

  const label = callType === 'audio' ? 'Audio' : 'Video';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" color={colors.textJet} align="left">
          {loading ? `${label} · …` : `${label} · ${minutes} min`}
        </AppText>
        {rate.pricePerMinute ? (
          <AppText variant="bodySmall" color={colors.textMuted} align="left">
            {rate.pricePerMinute}
          </AppText>
        ) : null}
      </View>
      <AppButton label="Buy" radius={100} onPress={openBuy} />
    </View>
  );
}

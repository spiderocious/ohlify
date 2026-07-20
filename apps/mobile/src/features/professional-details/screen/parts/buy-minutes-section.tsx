import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppText, colors, showCustomModal, showFeedbackModal, showToast } from '@ohlify/mobile-ui';
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

  function promptFundWallet() {
    showFeedbackModal('Insufficient wallet balance', "You don't have enough funds to buy these minutes. Fund your wallet to continue.", {
      kind: 'warning',
      showCloseButton: true,
      confirmButtonText: 'Fund wallet',
      onConfirm: () => navigation.navigate('Home', { screen: 'WalletTab', params: { openFund: true } }),
    });
  }

  /** Returns null on success, or an error message on failure (except insufficient_balance, which shows its own modal directly). */
  async function buy(amountKobo: number): Promise<string | null> {
    try {
      const res = await minutesApi.buyMinutes({ professionalId, callType, amountKobo });
      setMinutes(res.minutesRemaining);
      showToast(`Added ${res.minutesPurchased} minutes.`, { type: 'success' });
      await goToChat();
      return null;
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      if (error.reason === 'insufficient_balance') {
        promptFundWallet();
        return 'handled';
      }
      return apiErrorMessage(error);
    }
  }

  function openBuy() {
    const perMin = perMinuteKobo(rate);
    const handle = showCustomModal(
      `Buy ${callType} minutes`,
      (dismiss) => (
        <BuyMinutesModalBody perMinuteKobo={perMin} onBuy={buy} onDone={dismiss} onBusyChange={(busy) => handle.setDismissible(!busy)} />
      ),
      { position: 'bottom' },
    );
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
      <AppButton label="Buy" radius={100} height={40} paddingHorizontal={22} onPress={openBuy} />
    </View>
  );
}

/**
 * Owns amount/save-in-flight/error state so the modal stays open (and locked
 * shut via onBusyChange -> handle.setDismissible) while the purchase is in
 * flight, and only dismisses on real success — instead of the old
 * dismiss-then-buy pattern, which closed the modal immediately regardless of
 * whether the purchase actually succeeded. A 'handled' result from onBuy
 * means the insufficient-balance modal is already showing, so this closes
 * without also surfacing an inline error.
 */
function BuyMinutesModalBody({
  perMinuteKobo,
  onBuy,
  onDone,
  onBusyChange,
}: {
  perMinuteKobo: number;
  onBuy: (amountKobo: number) => Promise<string | null>;
  onDone: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleConfirm() {
    const clean = amount.replace(/[^0-9.]/g, '');
    const naira = Number(clean) || 0;
    const kobo = Math.round(naira * 100);
    if (kobo <= 0) {
      setErrorMessage('Enter a valid amount.');
      return;
    }
    setIsSaving(true);
    onBusyChange(true);
    setErrorMessage(undefined);
    const result = await onBuy(kobo);
    setIsSaving(false);
    onBusyChange(false);
    if (result === null || result === 'handled') {
      onDone();
    } else {
      setErrorMessage(result);
    }
  }

  return (
    <BuyMinutesForm
      perMinuteKobo={perMinuteKobo}
      onChanged={setAmount}
      onConfirm={() => void handleConfirm()}
      isSaving={isSaving}
      errorMessage={errorMessage}
    />
  );
}

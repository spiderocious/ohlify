import { useState } from 'react';
import { Show } from 'meemaw';
import { useNavigate } from 'react-router-dom';

import { ROUTES, formatNaira, parseNairaToKobo } from '@ohlify/core';
import type { ApiRate } from '@ohlify/api';
import { AppButton, AppText, AppTextInput, DrawerService } from '@ohlify/ui';

import { useOpenConversation } from '../../../chat/api/use-open-conversation.js';
import { useBuyMinutes } from '../../api/use-buy-minutes.js';
import { useMinutesBalance } from '../../api/use-minutes-balance.js';

interface BuyMinutesSectionProps {
  professionalId: string;
  rates: ReadonlyArray<ApiRate>;
}

/** Shows the user's per-call-type minute balance with this pro and lets them
 *  top up. Wallet-funded; on insufficient balance the API returns a 409 the
 *  user resolves by funding their wallet first. */
export function BuyMinutesSection({ professionalId, rates }: BuyMinutesSectionProps) {
  const hasAudio = rates.some((r) => r.call_type === 'audio');
  const hasVideo = rates.some((r) => r.call_type === 'video');

  if (!hasAudio && !hasVideo) return null;

  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Minutes
      </AppText>
      <div className="mt-2.5 flex flex-col gap-3 rounded-2xl bg-background p-4">
        <Show when={hasAudio}>
          <MinuteRow
            professionalId={professionalId}
            callType="audio"
            rate={rates.find((r) => r.call_type === 'audio')}
          />
        </Show>
        <Show when={hasVideo}>
          <MinuteRow
            professionalId={professionalId}
            callType="video"
            rate={rates.find((r) => r.call_type === 'video')}
          />
        </Show>
      </div>
    </div>
  );
}

interface MinuteRowProps {
  professionalId: string;
  callType: 'audio' | 'video';
  rate?: ApiRate;
}

function MinuteRow({ professionalId, callType, rate }: MinuteRowProps) {
  const navigate = useNavigate();
  const { data: balance } = useMinutesBalance(professionalId, callType);
  const buyMinutes = useBuyMinutes();
  const openConversation = useOpenConversation();
  const perMinute = rate?.price_per_minute_kobo ?? null;

  // After a successful purchase the user lands straight in the chat with this
  // pro (they now hold minutes, so the chat gate passes). The success toast
  // still fires. If opening the chat fails we simply stay put.
  const goToChat = () => {
    openConversation.mutate(professionalId, {
      onSuccess: (c) => navigate(ROUTES.CHAT_THREAD.build({ id: c.id })),
    });
  };

  const minutes = balance?.minutes_remaining ?? 0;
  const label = callType === 'audio' ? 'Audio' : 'Video';

  const openBuy = () => {
    let amountStr = '';
    DrawerService.showCustomModal(
      `Buy ${label.toLowerCase()} minutes`,
      (dismiss) => (
        <BuyMinutesForm
          perMinuteKobo={perMinute}
          onAmountChange={(v) => {
            amountStr = v;
          }}
          onConfirm={() => {
            const kobo = parseNairaToKobo(amountStr);
            if (kobo === null) {
              DrawerService.toast('Enter a valid amount.', { type: 'error' });
              return;
            }
            buyMinutes.mutate(
              { professional_id: professionalId, call_type: callType, amount_kobo: Number(kobo) },
              {
                onSuccess: (data) => {
                  dismiss();
                  DrawerService.toast(`Added ${data.minutes_purchased} minutes.`, {
                    type: 'success',
                  });
                  // Land the user in the chat with this pro (todo: "after
                  // payment they're taken to a chat screen").
                  goToChat();
                },
                onError: (err) => {
                  const e = err as { reason?: string; errorMessage?: string };
                  dismiss();
                  DrawerService.toast(
                    e.reason === 'insufficient_balance'
                      ? 'Your wallet balance is too low. Fund your wallet and try again.'
                      : (e.errorMessage ?? 'Could not buy minutes. Please try again.'),
                    { type: 'error' },
                  );
                },
              },
            );
          }}
        />
      ),
      { position: 'bottom' },
    );
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
          {label} · {minutes} min
        </AppText>
        <Show when={perMinute !== null}>
          <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
            {formatNaira(perMinute ?? 0)} / min
          </AppText>
        </Show>
      </div>
      <AppButton label="Buy" radius={100} height={40} onPressed={openBuy} />
    </div>
  );
}

interface BuyMinutesFormProps {
  perMinuteKobo: number | null;
  onAmountChange: (v: string) => void;
  onConfirm: () => void;
}

function BuyMinutesForm({ perMinuteKobo, onAmountChange, onConfirm }: BuyMinutesFormProps) {
  const [amount, setAmount] = useState('');
  const kobo = parseNairaToKobo(amount);
  const estMinutes =
    kobo !== null && perMinuteKobo && perMinuteKobo > 0
      ? Math.floor(Number(kobo) / perMinuteKobo)
      : 0;

  return (
    <div className="flex flex-col gap-3">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Enter how much to spend. Minutes are funded from your wallet.
      </AppText>
      <AppTextInput
        label="Amount"
        value={amount}
        placeholder="Enter amount"
        inputMode="decimal"
        onChange={(v) => {
          setAmount(v);
          onAmountChange(v);
        }}
      />
      <Show when={estMinutes > 0}>
        <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
          ≈ {estMinutes} minutes
        </AppText>
      </Show>
      <AppButton
        label="Buy minutes"
        expanded
        radius={100}
        isDisabled={estMinutes <= 0}
        onPressed={estMinutes <= 0 ? undefined : onConfirm}
      />
    </div>
  );
}

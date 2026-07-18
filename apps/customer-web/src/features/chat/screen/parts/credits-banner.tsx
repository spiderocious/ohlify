import { Show } from 'meemaw';

import { AppButton, AppText } from '@ohlify/ui';
import type { ConversationContext } from '@ohlify/api';

interface CreditsBannerProps {
  context: ConversationContext;
  onBuyMinutes: () => void;
}

/**
 * Sits directly above the composer. Warns the paying client when their minutes
 * with this pro are running low, and blocks messaging outright at zero (the
 * backend enforces the same rule with a 403).
 *
 * Never shown to the professional — they can always reply.
 */
export function CreditsBanner({ context, onBuyMinutes }: CreditsBannerProps) {
  if (!context.viewer_is_client) return null;

  const { minutes_remaining: minutes, low_minutes_threshold: threshold } = context;
  const isOut = minutes <= 0;
  const isLow = !isOut && minutes <= threshold;

  if (!isOut && !isLow) return null;

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
        isOut ? 'bg-error/10' : 'bg-warning/10'
      }`}
    >
      <AppText
        variant="bodySmall"
        align="start"
        color={isOut ? 'var(--ohl-error)' : 'var(--ohl-warning)'}
      >
        <Show when={isOut}>
          {"You're out of minutes with this professional. Buy minutes to keep chatting."}
        </Show>
        <Show when={isLow}>
          {`Only ${minutes} minute${minutes === 1 ? '' : 's'} left — top up to keep chatting and calling.`}
        </Show>
      </AppText>
      <AppButton label="Buy minutes" radius={100} height={34} onPressed={onBuyMinutes} />
    </div>
  );
}

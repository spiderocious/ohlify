import { Show } from 'meemaw';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppText } from '@ohlify/ui';

import { useIncomingCall } from '../../features/instant-call/api/use-incoming-call.js';

/** Foreground incoming-call prompt for the callee. Polls while the app is open;
 *  native killed-app ringing is Phase 7. */
export function IncomingCallBanner() {
  const navigate = useNavigate();
  const { data: incoming } = useIncomingCall();

  const answer = () => {
    if (!incoming) return;
    navigate(`${ROUTES.INSTANT_CALL.absPath}?answer=${encodeURIComponent(incoming.call_id)}`);
  };

  return (
    <Show when={Boolean(incoming)}>
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
        <AppText variant="body" weight={600} align="start" color="#fff">
          Incoming {incoming?.call_type === 'video' ? 'video' : 'audio'} call…
        </AppText>
        <AppButton label="Answer" radius={100} height={40} onPressed={answer} />
      </div>
    </Show>
  );
}

import { useNavigate } from 'react-router-dom';

import { AppButton, AppText } from '@ohlify/ui';
import { ROUTES } from '@ohlify/core';
import { IconPhoneCall } from '@icons';
import type { JoinableCall } from '@ohlify/api';

import { useJoinableCalls } from '../../features/calls/api/use-joinable-calls.js';

/**
 * Sticky banner that appears on every tabbed-shell screen (Home /
 * Calls / Wallet / Profile) the moment one of the user's calls flips
 * to joinable. Polls every 15s — the FCM push (when configured)
 * surfaces it sooner on mobile, but on web this is the canonical
 * signal.
 *
 * Renders nothing when there's no joinable call. When there are
 * multiple (rare), surfaces the first one and links to /calls so the
 * user can pick.
 */
export function JoinableCallBanner() {
  const navigate = useNavigate();
  const { data } = useJoinableCalls();
  const first = data?.[0];
  if (!first) return null;

  const SELF_ID = 'me';
  const join = () => {
    navigate(
      `${ROUTES.CALL_SESSION.build({
        role: first.is_caller ? 'caller' : 'callee',
        kind: 'audio',
        selfId: SELF_ID,
        peerId: first.peer_user_id,
        sessionId: first.call_id,
      })}?name=${encodeURIComponent(first.peer_full_name ?? 'Your call')}`,
    );
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 lg:px-5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <IconPhoneCall size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <AppText
          variant="bodySmall"
          weight={700}
          align="start"
          className="text-emerald-900"
        >
          {bannerTitle(first)}
        </AppText>
        <AppText
          variant="bodySmall"
          align="start"
          className="text-emerald-800/80"
        >
          {bannerSubtitle(first)}
        </AppText>
      </div>
      <AppButton
        label={first.is_caller ? 'Join' : 'Answer'}
        variant="solid"
        height={36}
        onPressed={join}
      />
    </div>
  );
}

function bannerTitle(call: JoinableCall): string {
  if (call.is_caller) return 'Your call is ready';
  return `${call.peer_full_name ?? 'Someone'} is calling you`;
}

function bannerSubtitle(call: JoinableCall): string {
  const name = call.peer_full_name ?? 'your professional';
  if (call.is_caller) return `${name} is in the room.`;
  return 'Tap Answer to join.';
}

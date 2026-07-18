import { Show } from 'meemaw';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppLoader, AppText, DrawerService } from '@ohlify/ui';
import type { JoinCallResponse } from '@ohlify/api';

import { useJoinCall } from '../api/use-join-call.js';
import { useLeaveCall } from '../api/use-leave-call.js';
import { CallAppFrame } from './parts/call-app-frame.js';
import { EmojiFeedbackBubble, DescriptionFeedbackBubble } from './parts/feedback-bubble.js';
import { useCallBridge } from './use-call-bridge.js';

type FeedbackStep = 'none' | 'emoji' | 'description';

/** Fetches join credentials then embeds the call-app iframe. */
export function CallSessionScreen() {
  const { role, kind, peerId, sessionId } = useParams<{
    role: string;
    kind: string;
    selfId: string;
    peerId: string;
    sessionId: string;
  }>();
  const [urlParams] = useSearchParams();
  const navigate = useNavigate();

  const peerName = urlParams.get('name') ?? 'Caller';
  const peerAvatarKey = urlParams.get('avatar') ?? null;

  const joinCall = useJoinCall();
  const [joinData, setJoinData] = useState<JoinCallResponse | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    joinCall.mutate(sessionId, {
      onSuccess: setJoinData,
      onError: (err) => {
        const e = err as { errorMessage?: string };
        setJoinError(e.errorMessage ?? 'Could not join call');
      },
    });
  }, []);

  if (joinError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white gap-4 px-6">
        <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">
          {joinError}
        </AppText>
        <AppButton
          label="Go back"
          radius={100}
          height={44}
          onPressed={() => navigate(ROUTES.HOME.absPath, { replace: true })}
        />
      </main>
    );
  }

  if (!joinData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <AppLoader />
      </main>
    );
  }

  return (
    <ActiveCallScreen
      role={role === 'callee' ? 'callee' : 'caller'}
      callType={kind === 'video' ? 'video' : 'audio'}
      peerName={peerName}
      peerAvatarKey={peerAvatarKey}
      peerId={peerId ?? ''}
      sessionId={sessionId ?? ''}
      joinData={joinData}
      navigate={navigate}
    />
  );
}

interface ActiveCallScreenProps {
  role: 'caller' | 'callee';
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatarKey: string | null;
  peerId: string;
  sessionId: string;
  joinData: JoinCallResponse;
  navigate: ReturnType<typeof useNavigate>;
}

function ActiveCallScreen({
  peerName,
  peerAvatarKey,
  peerId,
  sessionId,
  joinData,
  navigate,
}: ActiveCallScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const leaveCall = useLeaveCall(sessionId);

  const [callEnded, setCallEnded] = useState(false);
  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackStep>('none');
  const [ratingPushed, setRatingPushed] = useState(false);

  const goToRating = useCallback(() => {
    if (ratingPushed) return;
    setRatingPushed(true);
    const search = new URLSearchParams();
    search.set('name', peerName);
    if (peerAvatarKey) search.set('avatar', peerAvatarKey);
    if (peerId) search.set('peerId', peerId);
    if (sessionId) search.set('callId', sessionId);
    navigate(`${ROUTES.CALL_RATING.absPath}?${search.toString()}`, { replace: true });
  }, [ratingPushed, peerName, peerAvatarKey, peerId, sessionId, navigate]);

  const onEnded = useCallback(
    (reason: string, secs: number) => {
      setCallEnded(true);
      setConnectedSeconds(secs);
      leaveCall.mutate({
        reason: reason as 'hangup' | 'declined' | 'error',
        client_duration_seconds: secs,
      });
      if (secs === 0) {
        // call never connected — skip feedback, go straight home
        navigate(ROUTES.HOME.absPath, { replace: true });
        return;
      }
      setFeedback('emoji');
    },
    [leaveCall, navigate],
  );

  const { sendHangup } = useCallBridge({
    iframeRef,
    joinData,
    localName: 'Me',
    peerName,
    peerAvatarKey,
    peerAgoraUid: joinData.remote_user_id ? Number(joinData.remote_user_id) : 0,
    callReference: sessionId,
    onEnded,
  });

  const submitEmojiFeedback = useCallback(() => {
    let confirmed = false;
    const handle = DrawerService.showFeedbackModal(
      'Feedback submitted',
      'Thank you for sharing how you feel with us.',
      {
        kind: 'success',
        showCloseButton: false,
        onConfirm: () => {
          confirmed = true;
        },
      },
    );
    void handle.onDismissed.then(() => {
      if (confirmed) goToRating();
    });
  }, [goToRating]);

  void connectedSeconds; // used via onEnded, kept for future display

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      {/* call-app iframe — fills the screen while the call is live */}
      <Show when={!callEnded}>
        <div className="absolute inset-0">
          <CallAppFrame ref={iframeRef} />
        </div>
      </Show>

      {/* Post-call feedback overlay */}
      <Show when={callEnded && feedback !== 'none'}>
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/55 px-5 pb-6 pt-6">
          <div className="w-full max-w-lg">
            <Show when={feedback === 'emoji'}>
              <EmojiFeedbackBubble
                onSubmit={submitEmojiFeedback}
                onAddFeedback={() => setFeedback('description')}
                onSkip={goToRating}
              />
            </Show>
            <Show when={feedback === 'description'}>
              <DescriptionFeedbackBubble onSubmit={submitEmojiFeedback} onSkip={goToRating} />
            </Show>
          </div>
        </div>
      </Show>

      {/* Minimal hangup button for the host (call-app has its own but host can also end) */}
      <Show when={!callEnded}>
        <div className="absolute bottom-6 right-6 z-10">
          <button
            type="button"
            onClick={sendHangup}
            className="sr-only"
            aria-label="End call from host"
          >
            End
          </button>
        </div>
      </Show>
    </main>
  );
}

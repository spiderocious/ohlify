import { Show, Switch, Case } from 'meemaw';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ROUTES, type CallRole, type CallType } from '@ohlify/core';
import { AppButton, AppLoader, AppText, DrawerService, cn } from '@ohlify/ui';
import type { JoinCallResponse } from '@ohlify/api';

import { useJoinCall } from '../api/use-join-call.js';
import { useLeaveCall } from '../api/use-leave-call.js';
import { useRenewCallToken } from '../api/use-renew-call-token.js';
import { CallAvatar } from './parts/call-avatar.js';
import { CallBlurredBackdrop } from './parts/call-blurred-backdrop.js';
import { CallControls } from './parts/call-controls.js';
import {
  DescriptionFeedbackBubble,
  EmojiFeedbackBubble,
} from './parts/feedback-bubble.js';
import {
  useAgoraCallSession,
  type AgoraCallSession,
} from './use-agora-call-session.js';

type FeedbackStep = 'none' | 'emoji' | 'description';

/** Fetches join credentials then mounts the live Agora session. */
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

  const callRole: CallRole = role === 'callee' ? 'callee' : 'caller';
  const callType: CallType = kind === 'video' ? 'video' : 'audio';
  const peerName = urlParams.get('name') ?? 'Caller';
  const peerAvatarKey = urlParams.get('avatar') ?? undefined;

  const joinCall = useJoinCall();
  const [joinData, setJoinData] = useState<JoinCallResponse | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    joinCall.mutate(sessionId, {
      onSuccess: setJoinData,
      onError: (err) => {
        const e = err as { message?: string };
        setJoinError(e.message ?? 'Could not join call');
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (joinError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white gap-4 px-6">
        <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">{joinError}</AppText>
        <AppButton label="Go back" radius={100} height={44} onPressed={() => navigate(ROUTES.HOME.absPath, { replace: true })} />
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
      callRole={callRole}
      callType={callType}
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
  callRole: CallRole;
  callType: CallType;
  peerName: string;
  peerAvatarKey?: string;
  peerId: string;
  sessionId: string;
  joinData: JoinCallResponse;
  navigate: ReturnType<typeof useNavigate>;
}

/**
 * Mounts once join credentials are available.
 * Mirrors mobile/lib/features/call_session/screen/call_session_screen.dart.
 */
function ActiveCallScreen({
  callRole,
  callType,
  peerName,
  peerAvatarKey,
  peerId,
  sessionId,
  joinData,
  navigate,
}: ActiveCallScreenProps) {
  const isVideo = callType === 'video';

  const leaveCall = useLeaveCall(sessionId);
  const renewToken = useRenewCallToken(sessionId);

  const onLeave = useCallback(
    (reason: 'hangup' | 'declined') => {
      leaveCall.mutate({ reason });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onRenewToken = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      renewToken.mutate(undefined, {
        onSuccess: (data) => resolve(data.agora_token),
        onError: reject,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session: AgoraCallSession = useAgoraCallSession({
    role: callRole,
    callType,
    joinData,
    onLeave,
    onRenewToken,
  });

  const [feedback, setFeedback] = useState<FeedbackStep>('none');
  const [ratingPushed, setRatingPushed] = useState(false);

  useEffect(() => {
    if (session.phase.tag !== 'ended') return;
    if (feedback !== 'none' || ratingPushed) return;
    if (session.phase.connectedAt === undefined) {
      navigate(ROUTES.HOME.absPath, { replace: true });
      return;
    }
    setFeedback('emoji');
  }, [session.phase.tag, session.phase.connectedAt, feedback, ratingPushed, navigate]);

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

  const submitEmojiFeedback = () => {
    let confirmed = false;
    const handle = DrawerService.showFeedbackModal(
      'Feedback submitted',
      'Thank you for sharing how you feel with us, we take all feedbacks seriously and will now review.',
      {
        kind: 'success',
        showCloseButton: false,
        onConfirm: () => { confirmed = true; },
      },
    );
    void handle.onDismissed.then(() => {
      if (confirmed) goToRating();
    });
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black text-white">
      <CallBlurredBackdrop fileKey={peerAvatarKey} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Switch>
          <Case when={session.phase.tag === 'joining'}>
            <div className="flex flex-1 items-center justify-center">
              <AppLoader />
            </div>
          </Case>
          <Case when={session.phase.tag === 'dialing'}>
            <DialingBody peerName={peerName} peerAvatarKey={peerAvatarKey} onHangup={session.hangup} />
          </Case>
          <Case when={session.phase.tag === 'connecting'}>
            <ConnectingBody peerName={peerName} peerAvatarKey={peerAvatarKey} />
          </Case>
          <Case when={session.phase.tag === 'active'}>
            <ActiveBody
              isVideo={isVideo}
              peerName={peerName}
              peerAvatarKey={peerAvatarKey}
              elapsedLabel={session.elapsedLabel}
              muted={session.muted}
              speakerOn={session.speakerOn}
              cameraEnabled={session.cameraEnabled}
              remoteVideoRef={session.remoteVideoRef}
              localVideoRef={session.localVideoRef}
              onToggleMute={session.toggleMute}
              onToggleSpeaker={session.toggleSpeaker}
              onToggleCamera={session.toggleCamera}
              onHangup={session.hangup}
            />
          </Case>
          <Case when={session.phase.tag === 'ended'}>
            <EndedBody />
          </Case>
          <Case when={session.phase.tag === 'error'}>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">
                {session.phase.errorMessage ?? 'Connection error'}
              </AppText>
              <AppButton label="Go back" radius={100} height={44} onPressed={() => navigate(ROUTES.HOME.absPath, { replace: true })} />
            </div>
          </Case>
        </Switch>
      </div>

      <Show when={feedback !== 'none'}>
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
    </main>
  );
}

interface BodyProps {
  peerName: string;
  peerAvatarKey?: string;
}

function DialingBody({ peerName, peerAvatarKey, onHangup }: BodyProps & { onHangup: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 py-12">
      <span />
      <div className="flex flex-col items-center gap-5 text-center">
        <CallAvatar fileKey={peerAvatarKey} />
        <AppText variant="title" weight={700} align="center" color="#fff">{peerName}</AppText>
        <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">Dialing…</AppText>
      </div>
      <button
        type="button"
        onClick={onHangup}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white shadow-lg"
        aria-label="End call"
      >
        ✕
      </button>
    </div>
  );
}

function ConnectingBody({ peerName, peerAvatarKey }: BodyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <CallAvatar fileKey={peerAvatarKey} />
      <AppText variant="title" weight={700} align="center" color="#fff">{peerName}</AppText>
      <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">Connecting…</AppText>
    </div>
  );
}

interface ActiveBodyProps extends BodyProps {
  isVideo: boolean;
  elapsedLabel: string;
  muted: boolean;
  speakerOn: boolean;
  cameraEnabled: boolean;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onHangup: () => void;
}

function ActiveBody({
  isVideo,
  peerName,
  peerAvatarKey,
  elapsedLabel,
  muted,
  speakerOn,
  cameraEnabled,
  remoteVideoRef,
  localVideoRef,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onHangup,
}: ActiveBodyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <AppText variant="bodyTitle" weight={700} align="center" color="#fff">{peerName}</AppText>
        <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">{elapsedLabel}</AppText>
      </div>

      <div className={cn('relative flex flex-col items-center gap-5', isVideo ? 'w-full flex-1 py-4' : '')}>
        {isVideo ? (
          <>
            {/* Remote video fills the center */}
            <div ref={remoteVideoRef} className="w-full flex-1 rounded-2xl overflow-hidden bg-gray-900 min-h-48" />
            {/* Local video PiP in corner */}
            <div ref={localVideoRef} className="absolute bottom-2 right-2 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 bg-gray-800" />
          </>
        ) : (
          <CallAvatar fileKey={peerAvatarKey} size={140} />
        )}
      </div>

      <CallControls
        isVideo={isVideo}
        muted={muted}
        speakerOn={speakerOn}
        cameraEnabled={cameraEnabled}
        onToggleMute={onToggleMute}
        onToggleSpeaker={onToggleSpeaker}
        onToggleCamera={onToggleCamera}
        onHangup={onHangup}
      />
    </div>
  );
}

function EndedBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <AppText variant="title" weight={700} align="center" color="#fff">Call ended</AppText>
    </div>
  );
}

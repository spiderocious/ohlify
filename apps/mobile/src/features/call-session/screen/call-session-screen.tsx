import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showFeedbackModal, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { subscribeCallSignals } from '@shared/push/call-signals';
import { RealtimeEvent } from '@shared/realtime/realtime-events';
import { subscribeRealtimeSignals } from '@shared/realtime/realtime-signals';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { callsApi } from '@features/calls/api/calls-api';
import { instantCallsApi } from '@features/instant-calls/api/instant-calls-api';
import type { CallParticipant } from '@features/instant-calls/types/instant-call-models';
import { CallAppWebView, type CallAppMessage, type CallAppWebViewHandle } from './parts/call-app-webview';
import { DescriptionFeedbackBubble, EmojiFeedbackBubble } from './parts/feedback-bubble';
import { OutOfMinutesOverlay } from './parts/out-of-minutes-overlay';
import { InviteApprovalOverlay } from './parts/invite-approval-overlay';
import { ParticipantStrip } from './parts/participant-strip';
import { showInviteSheet } from './parts/invite-sheet';

/** How long an instant-call caller waits for an answer before giving up — mirrors the backend's ring window. */
const NO_ANSWER_MS = 45_000;

/**
 * How long a paused call waits for the caller to act before ending itself.
 *
 * Only the *idle* case is timed. Once they open the buy flow the call stays up:
 * cutting someone off mid-payment is the worst possible moment to hang up, and
 * the professional can still end it from their side.
 */
const PAUSED_IDLE_LIMIT_SECONDS = 90;

/** Mirrors `presence.invite_approval_timeout_seconds`; the server is authoritative. */
const INVITE_APPROVAL_SECONDS = 30;

interface PendingInvite {
  participantId: string;
  userId: string;
}

/** Falls back to a neutral label — the roster may not have caught up with the SSE hint yet. */
function inviteeLabel(participants: CallParticipant[], userId: string): string {
  return participants.find((p) => p.userId === userId)?.name ?? 'someone';
}

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CallSession'>;

type FeedbackStep = 'none' | 'emoji' | 'description';

/**
 * Embeds the call-app React bundle in a WebView and drives the postMessage
 * bridge. All RTC logic lives in the call-app; this screen just wires
 * join/renew/end. Mirrors mobile/lib/features/call_session/screen/
 * call_session_screen.dart.
 */
export function CallSessionScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const config = route.params;

  const webViewHandleRef = useRef<CallAppWebViewHandle | null>(null);
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>('none');
  const [callEnded, setCallEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsUntilEnd, setSecondsUntilEnd] = useState(PAUSED_IDLE_LIMIT_SECONDS);
  const ratingPushedRef = useRef(false);
  const connectedRef = useRef(false);

  // Only the caller tops up, and only when there is a professional to buy from.
  const canTopUp = config.role === 'caller' && Boolean(config.instant?.professionalId);
  // Only the person being billed may add someone — the callee inviting would
  // spend the caller's balance.
  const canInvite = config.role === 'caller' && Boolean(config.instant);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [isResolvingInvite, setIsResolvingInvite] = useState(false);

  const callId = config.instant ? config.sessionId : null;

  const refreshParticipants = useCallback(async () => {
    if (!callId) return;
    try {
      setParticipants(await instantCallsApi.participants(callId));
    } catch {
      // A stale roster is cosmetic; the call itself is unaffected.
    }
  }, [callId]);

  useEffect(() => {
    void refreshParticipants();
  }, [refreshParticipants]);

  // Approval arrives over SSE rather than the call-app datachannel: letting the
  // call client assert who may join would make authorization a client-side
  // claim. The shell asks, the server decides.
  useEffect(() => {
    if (!callId) return;
    return subscribeRealtimeSignals((signal) => {
      if (signal.data['call_id'] !== undefined && signal.data['call_id'] !== callId) return;
      switch (signal.type) {
        case RealtimeEvent.CALL_INVITE_REQUESTED: {
          const participantId = signal.data['participant_id'];
          if (participantId !== undefined) {
            setPendingInvite({ participantId, userId: signal.data['user_id'] ?? '' });
          }
          void refreshParticipants();
          break;
        }
        case RealtimeEvent.CALL_INVITE_RESOLVED:
          setPendingInvite(null);
          void refreshParticipants();
          break;
        case RealtimeEvent.CALL_PARTICIPANTS_CHANGED:
          void refreshParticipants();
          break;
        default:
          break;
      }
    });
  }, [callId, refreshParticipants]);

  const resolveInvite = useCallback(
    async (approve: boolean) => {
      if (!callId || !pendingInvite) return;
      setIsResolvingInvite(true);
      try {
        await instantCallsApi.respondToInvite(callId, pendingInvite.participantId, approve);
        setPendingInvite(null);
        void refreshParticipants();
      } catch (e) {
        showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
      } finally {
        setIsResolvingInvite(false);
      }
    },
    [callId, pendingInvite, refreshParticipants],
  );

  const submitInvite = useCallback(
    async (handle: string): Promise<string | null> => {
      if (!callId) return 'This call cannot take invites.';
      try {
        await instantCallsApi.invite(callId, handle);
        void refreshParticipants();
        showToast('Invite sent — waiting for approval', { type: 'success' });
        return null;
      } catch (e) {
        const error = e instanceof ApiError ? e : ApiError.network;
        return error.firstFieldError ?? apiErrorMessage(error);
      }
    },
    [callId, refreshParticipants],
  );

  const sendJoin = useCallback(() => {
    const push = (joinData: Parameters<CallAppWebViewHandle['sendJoin']>[0]['joinData']) => {
      webViewHandleRef.current?.sendJoin({
        joinData,
        localName: 'Me',
        localAvatarKey: config.selfAvatarUrl,
        peerName: config.peerName,
        peerAvatarKey: config.peerAvatarUrl,
        // The peer's Agora UID isn't known until the call-app sees the
        // remote join event; 0 tells call-app to accept any participant.
        peerAgoraUid: 0,
        callReference: config.sessionId,
        role: config.role,
        callType: config.kind,
        allottedSeconds: config.instant?.secondsAllotted,
      });
    };
    // Instant calls: the start/answer response already carried the join
    // creds — no extra round-trip, and the scheduled-calls join endpoint
    // doesn't know these call ids.
    if (config.instant) {
      push({
        callId: config.sessionId,
        appId: config.instant.appId,
        channel: config.instant.channel,
        uid: config.instant.uid,
        agoraToken: config.instant.agoraToken,
        expiresAt: config.instant.expiresAt,
      });
      return;
    }

    callsApi
      .join(config.sessionId)
      .then(push)
      .catch(() => {
        navigation.navigate('Home');
      });
  }, [config, navigation]);

  const renewToken = useCallback(() => {
    // Instant calls have no renew endpoint — the token minted at start
    // outlives any billable call (capped by minutes_allotted anyway).
    if (config.instant) return;
    callsApi
      .renewToken(config.sessionId)
      .then((res) => {
        webViewHandleRef.current?.sendRenewToken({ agoraToken: res.agoraToken, expiresAt: res.expiresAt });
      })
      .catch(() => undefined);
  }, [config.instant, config.sessionId]);

  const goToRating = useCallback(() => {
    if (ratingPushedRef.current) return;
    ratingPushedRef.current = true;
    navigation.replace('CallRating', { peerName: config.peerName, peerAvatarUrl: config.peerAvatarUrl, callId: config.sessionId });
  }, [navigation, config.peerName, config.peerAvatarUrl, config.sessionId]);

  const submitEmojiFeedback = useCallback(() => {
    let confirmed = false;
    const handle = showFeedbackModal(
      'Feedback submitted',
      'Thank you for sharing how you feel with us, we take all feedbacks seriously and will now review.',
      {
        kind: 'success',
        showCloseButton: false,
        onConfirm: () => {
          confirmed = true;
        },
      },
    );
    handle.onDismissed.then(() => {
      if (confirmed) goToRating();
    });
  }, [goToRating]);

  const onCallEnded = useCallback(
    (connectedSeconds: number, reason: string) => {
      if (config.instant) {
        // Instant calls settle on /end: server clamps + meters, and a
        // still-ringing call resolves to cancelled/missed with no charge.
        instantCallsApi.end(config.sessionId, connectedSeconds).catch(() => undefined);
      } else {
        callsApi.leave(config.sessionId, { reason, clientDurationSeconds: connectedSeconds }).catch(() => undefined);
      }
      setCallEnded(true);

      if (connectedSeconds === 0) {
        navigation.navigate('Home');
        return;
      }
      setFeedbackStep('emoji');
    },
    [config.instant, config.sessionId, navigation],
  );

  // Instant-call caller: give up when nobody answers within the ring
  // window (the backend's ring resolver marks it missed on its side; /end
  // is idempotent so racing it is harmless).
  useEffect(() => {
    if (!config.instant || config.role !== 'caller') return;
    const timer = setTimeout(() => {
      if (connectedRef.current) return;
      showToast('No answer. Try again later.', { type: 'info' });
      webViewHandleRef.current?.sendHangup();
    }, NO_ANSWER_MS);
    return () => clearTimeout(timer);
  }, [config.instant, config.role]);

  // Live call signals (push-delivered): the callee declined, answered
  // elsewhere, or the ring timed out server-side → stop dialing.
  useEffect(() => {
    if (!config.instant) return;
    return subscribeCallSignals((signal) => {
      if (signal.callId !== config.sessionId || connectedRef.current) return;
      showToast(
        signal.reason === 'declined' ? 'Call declined.' : 'Call ended.',
        { type: 'info' },
      );
      webViewHandleRef.current?.sendHangup();
    });
  }, [config.instant, config.sessionId]);

  /**
   * The balance hit zero. Metering stops on the server too, so the paused
   * window is excluded from the charge rather than billed as dead air.
   */
  const onDurationElapsed = useCallback(() => {
    if (!config.instant || isPaused) return;
    setIsPaused(true);
    setSecondsUntilEnd(PAUSED_IDLE_LIMIT_SECONDS);
    webViewHandleRef.current?.sendPauseDuration();
    instantCallsApi.pause(config.sessionId).catch(() => undefined);
  }, [config.instant, config.sessionId, isPaused]);

  const onTopUpComplete = useCallback(() => {
    setIsPaused(false);
    webViewHandleRef.current?.sendResumeDuration();
    instantCallsApi.resume(config.sessionId).catch(() => undefined);
  }, [config.sessionId]);

  // Idle countdown while paused. Restarts on every pause so a caller who
  // topped up once and ran out again gets the full window a second time.
  useEffect(() => {
    if (!isPaused) return;
    const timer = setInterval(() => {
      setSecondsUntilEnd((remaining) => {
        if (remaining <= 1) {
          webViewHandleRef.current?.sendHangup();
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleMessage = useCallback(
    (msg: CallAppMessage) => {
      switch (msg.type) {
        case 'ready':
          sendJoin();
          break;
        case 'active':
          connectedRef.current = true;
          break;
        case 'ended':
          onCallEnded(msg.connectedSeconds, msg.reason);
          break;
        case 'token-expiring':
          renewToken();
          break;
        case 'duration-warning':
          if (canTopUp) {
            showToast(`${msg.remainingSeconds}s of minutes left.`, { type: 'info' });
          }
          break;
        case 'duration-paused':
          onDurationElapsed();
          break;
        case 'permission-needed':
        case 'duration-resumed':
          break;
      }
    },
    [sendJoin, renewToken, onCallEnded, onDurationElapsed, canTopUp],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {!callEnded ? <CallAppWebView ref={webViewHandleRef} onMessage={handleMessage} /> : null}
      {!callEnded && isPaused && canTopUp && config.instant ? (
        <OutOfMinutesOverlay
          professionalId={config.instant.professionalId}
          callType={config.kind}
          secondsUntilEnd={secondsUntilEnd}
          onResume={onTopUpComplete}
          onFundWallet={() => navigation.navigate('Home', { screen: 'WalletTab', params: { openFund: true } })}
          onEndCall={() => webViewHandleRef.current?.sendHangup()}
        />
      ) : null}
      {!callEnded && callId ? (
        <View style={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
          <ParticipantStrip
            participants={participants}
            canInvite={canInvite}
            onInvite={() => showInviteSheet({ onSubmit: submitInvite })}
          />
        </View>
      ) : null}
      {!callEnded && pendingInvite ? (
        <InviteApprovalOverlay
          inviterName={config.peerName}
          inviteeName={inviteeLabel(participants, pendingInvite.userId)}
          secondsRemaining={INVITE_APPROVAL_SECONDS}
          isSubmitting={isResolvingInvite}
          onApprove={() => void resolveInvite(true)}
          onDecline={() => void resolveInvite(false)}
        />
      ) : null}
      {callEnded && feedbackStep !== 'none' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 24 }}>
            {feedbackStep === 'emoji' ? (
              <EmojiFeedbackBubble onSubmit={submitEmojiFeedback} onAddFeedback={() => setFeedbackStep('description')} onSkip={goToRating} />
            ) : (
              <DescriptionFeedbackBubble onSubmit={submitEmojiFeedback} onSkip={goToRating} />
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

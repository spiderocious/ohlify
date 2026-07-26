import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showFeedbackModal, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { subscribeCallSignals } from '@shared/push/call-signals';

import type { RootStackParamList } from '../../../app.navigation';
import { callsApi } from '@features/calls/api/calls-api';
import { instantCallsApi } from '@features/instant-calls/api/instant-calls-api';
import { CallAppWebView, type CallAppMessage, type CallAppWebViewHandle } from './parts/call-app-webview';
import { DescriptionFeedbackBubble, EmojiFeedbackBubble } from './parts/feedback-bubble';

/** How long an instant-call caller waits for an answer before giving up — mirrors the backend's ring window. */
const NO_ANSWER_MS = 45_000;

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
  const ratingPushedRef = useRef(false);
  const connectedRef = useRef(false);

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
        case 'permission-needed':
          break;
      }
    },
    [sendJoin, renewToken, onCallEnded],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {!callEnded ? <CallAppWebView ref={webViewHandleRef} onMessage={handleMessage} /> : null}
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

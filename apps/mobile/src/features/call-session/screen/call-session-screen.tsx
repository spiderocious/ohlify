import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showFeedbackModal } from '@ohlify/mobile-ui';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import type { RootStackParamList } from '../../../app.navigation';
import { callsApi } from '@features/calls/api/calls-api';
import { CallAppWebView, type CallAppMessage, type CallAppWebViewHandle } from './parts/call-app-webview';
import { DescriptionFeedbackBubble, EmojiFeedbackBubble } from './parts/feedback-bubble';

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

  const sendJoin = useCallback(() => {
    callsApi
      .join(config.sessionId)
      .then((joinData) => {
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
      })
      .catch(() => {
        navigation.navigate('Home');
      });
  }, [config, navigation]);

  const renewToken = useCallback(() => {
    callsApi
      .renewToken(config.sessionId)
      .then((res) => {
        webViewHandleRef.current?.sendRenewToken({ agoraToken: res.agoraToken, expiresAt: res.expiresAt });
      })
      .catch(() => undefined);
  }, [config.sessionId]);

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
      callsApi.leave(config.sessionId, { reason, clientDurationSeconds: connectedSeconds }).catch(() => undefined);
      setCallEnded(true);

      if (connectedSeconds === 0) {
        navigation.navigate('Home');
        return;
      }
      setFeedbackStep('emoji');
    },
    [config.sessionId, navigation],
  );

  const handleMessage = useCallback(
    (msg: CallAppMessage) => {
      switch (msg.type) {
        case 'ready':
          sendJoin();
          break;
        case 'active':
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

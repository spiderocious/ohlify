import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppAvatar, AppText, colors, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { subscribeCallSignals } from '@shared/push/call-signals';
import { dismissIncomingCall } from '@shared/push/push-service';
import { fileService } from '@shared/services/file-service';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { useAppLock } from '@features/app-lock/providers/app-lock-provider';
import { instantCallsApi } from '../api/instant-calls-api';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'IncomingCall'>;

/**
 * Full-screen incoming-call UI. Reached from the ring notification (body
 * press, Accept action, or the lock-screen full-screen intent). The push
 * that got us here is only a hint — Accept re-validates via /answer, which
 * 409s if the call stopped ringing while the phone was in a pocket.
 */
export function IncomingCallScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { callId, callerUserId, callerName, callerAvatarUrl, callType, ringExpiresAt, autoAccept } =
    route.params;

  const [answering, setAnswering] = useState(false);
  const doneRef = useRef(false);
  const { suspendLock, resumeLock } = useAppLock();

  // A ringing call punches through the app lock. Demanding a PIN before someone
  // can answer costs answered calls, and the caller is paying for every second
  // spent typing it. Everything BEHIND this screen stays locked — the lock
  // resumes the moment the ring is resolved.
  useEffect(() => {
    suspendLock();
    return () => resumeLock();
  }, [suspendLock, resumeLock]);

  const leave = useCallback(
    (message?: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (message) showToast(message, { type: 'info' });
      void dismissIncomingCall(callId);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace('Home');
    },
    [callId, navigation],
  );

  const accept = useCallback(async () => {
    if (doneRef.current || answering) return;
    setAnswering(true);
    void dismissIncomingCall(callId);
    try {
      const join = await instantCallsApi.answer(callId);
      doneRef.current = true;
      navigation.replace('CallSession', {
        sessionId: join.callId,
        kind: join.callType === 'video' ? 'video' : 'audio',
        role: 'callee',
        selfId: '',
        peerId: callerUserId,
        peerName: callerName,
        peerRole: 'client',
        peerAvatarUrl: callerAvatarUrl,
        instant: {
          appId: join.agoraAppId,
          channel: join.agoraChannelName,
          uid: join.agoraUid,
          agoraToken: join.agoraToken,
          expiresAt: join.expiresAt,
          secondsAllotted: join.secondsAllotted,
          // The answering side is the professional being paid — they never top
          // up, so there is no pro to buy time from. The caller owns that flow.
          professionalId: '',
        },
      });
    } catch (e) {
      setAnswering(false);
      const error = e instanceof ApiError ? e : ApiError.network;
      leave(
        error.reason === 'call_not_joinable' || error.reason === 'call_not_found'
          ? 'This call already ended.'
          : apiErrorMessage(error),
      );
    }
  }, [answering, callId, callerAvatarUrl, callerName, callerUserId, leave, navigation]);

  const decline = useCallback(() => {
    if (doneRef.current) return;
    instantCallsApi.end(callId, 0).catch(() => undefined);
    leave();
  }, [callId, leave]);

  // Accept action pressed on the notification itself → answer immediately.
  // Mount-only by design: autoAccept is a cold-start param, never flips.
  useEffect(() => {
    if (autoAccept) void accept();
  }, []);

  // The caller hung up / it timed out / it was answered on another device.
  useEffect(
    () =>
      subscribeCallSignals((signal) => {
        if (signal.callId !== callId) return;
        leave(signal.reason === 'answered_elsewhere' ? undefined : 'Call ended.');
      }),
    [callId, leave],
  );

  // Local ring-window countdown — mirrors the backend's ring resolver so
  // this screen never outlives the call it represents.
  useEffect(() => {
    const expiresMs = ringExpiresAt ? Date.parse(ringExpiresAt) : NaN;
    const delay = Number.isNaN(expiresMs) ? 45_000 : Math.max(0, expiresMs - Date.now());
    const timer = setTimeout(() => leave('Call ended.'), delay);
    return () => clearTimeout(timer);
  }, [leave, ringExpiresAt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#111122', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 32 }}>
      <View style={{ alignItems: 'center', gap: 20, marginTop: 40 }}>
        <AppText variant="body" color="rgba(255,255,255,0.6)">
          Incoming {callType} call
        </AppText>
        <AppAvatar fileKey={callerAvatarUrl} resolveUri={fileService.mintViewUri} name={callerName} size={112} />
        <AppText variant="title" color="#FFFFFF" align="center">
          {callerName}
        </AppText>
        <AppText variant="body" color="rgba(255,255,255,0.6)" align="center">
          {answering ? 'Connecting…' : 'is calling you on Ohlify'}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-evenly', alignItems: 'flex-end' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={decline}
            disabled={answering}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#E5484D',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || answering ? 0.7 : 1,
            })}
          >
            <AppText variant="header" color="#FFFFFF">✕</AppText>
          </Pressable>
          <AppText variant="bodySmall" color="rgba(255,255,255,0.7)">Decline</AppText>
        </View>

        <View style={{ alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => void accept()}
            disabled={answering}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="header" color="#FFFFFF">{answering ? '…' : '✓'}</AppText>
          </Pressable>
          <AppText variant="bodySmall" color="rgba(255,255,255,0.7)">Accept</AppText>
        </View>
      </View>
    </View>
  );
}

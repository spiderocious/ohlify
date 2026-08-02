import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppAvatar, AppText, colors } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { fileService } from '@shared/services/file-service';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { useIsOnline } from '@shared/api/use-refresh-state';

import type { RootStackParamList } from '../../../app.navigation';
import { instantCallsApi } from '../api/instant-calls-api';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'OutgoingCall'>;

/**
 * Copy for the cases worth naming. The server sends one message for every
 * `professional_unavailable`, but `rejectionReason` says which branch produced
 * it — and "she's on another call" is a different problem for the caller than
 * "she isn't taking calls right now".
 *
 * Anything not listed falls through to the server's own message.
 */
const REJECTION_COPY: Record<string, string> = {
  busy: 'They’re on another call right now. Try again in a few minutes.',
  race_lost: 'Someone else just got through. Try again in a moment.',
  dnd: 'They’ve paused calls for now. Try again later.',
  not_accepting: 'They aren’t taking calls right now.',
  no_device_token: 'They can’t be reached on their device right now.',
};

const callFailureMessage = (error: ApiError): string => {
  if (error.reason === 'insufficient_balance') {
    return 'You don’t have minutes with this professional. Buy minutes to call.';
  }
  const detail = error.rejectionReason;
  if (detail !== undefined && detail in REJECTION_COPY) return REJECTION_COPY[detail]!;
  return apiErrorMessage(error);
};

/**
 * The outgoing half of the ring, and the screen that owns starting the call.
 *
 * It exists because POST /instant-calls is not instant: the tap used to fire
 * the request from the screen behind it and show nothing at all until either a
 * call session appeared or a toast did. Navigating here first makes the tap
 * feel immediate, gives the request somewhere to fail visibly, and matches what
 * the callee sees — same wash, same avatar, same geometry as IncomingCallScreen.
 *
 * The call cannot be started any earlier than this: CallSession needs the Agora
 * credentials that only this response carries.
 */
export function OutgoingCallScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { professionalId, professionalName, professionalAvatarUrl, callType } = route.params;

  const isOnline = useIsOnline();
  const [error, setError] = useState<string | null>(null);
  // Guards the whole screen, not just the button: a retry that lands while the
  // first attempt is still in flight would start two calls.
  const dialingRef = useRef(false);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Home');
  }, [navigation]);

  const dial = useCallback(async () => {
    if (dialingRef.current) return;
    // A cached balance is fine to READ and wrong to act on — the server
    // preflight is the only thing that knows. Failing here beats starting a
    // call that cannot be paid for.
    if (!isOnline) {
      setError('You’re offline. Reconnect to start a call.');
      return;
    }
    dialingRef.current = true;
    setError(null);
    try {
      const join = await instantCallsApi.start({ professionalId, callType });
      // The pro's devices are ringing (server pushed) — hand over to the call
      // session, replacing so back never returns to a dead dial screen.
      navigation.replace('CallSession', {
        sessionId: join.callId,
        kind: join.callType === 'video' ? 'video' : 'audio',
        role: 'caller',
        selfId: '',
        peerId: professionalId,
        peerName: professionalName,
        peerRole: 'professional',
        ...(professionalAvatarUrl === undefined ? {} : { peerAvatarUrl: professionalAvatarUrl }),
        instant: {
          appId: join.agoraAppId,
          channel: join.agoraChannelName,
          uid: join.agoraUid,
          agoraToken: join.agoraToken,
          expiresAt: join.expiresAt,
          secondsAllotted: join.secondsAllotted,
          professionalId,
        },
      });
    } catch (e) {
      dialingRef.current = false;
      setError(callFailureMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }, [callType, isOnline, navigation, professionalAvatarUrl, professionalId, professionalName]);

  // Mount-only: the screen exists to make exactly one call attempt. Retries go
  // through the button, which resets the guard first.
  useEffect(() => {
    void dial();
  }, []);

  const hasFailed = error !== null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#111122',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 80,
        paddingHorizontal: 32,
      }}
    >
      <View style={{ alignItems: 'center', gap: 20, marginTop: 40 }}>
        <AppText variant="body" color="rgba(255,255,255,0.6)">
          {callType === 'video' ? 'Video call' : 'Audio call'}
        </AppText>
        <AppAvatar
          fileKey={professionalAvatarUrl}
          resolveUri={fileService.mintViewUri}
          name={professionalName}
          size={112}
        />
        <AppText variant="title" color="#FFFFFF" align="center">
          {professionalName}
        </AppText>
        <AppText
          variant="body"
          color={hasFailed ? '#FF9AA0' : 'rgba(255,255,255,0.6)'}
          align="center"
        >
          {hasFailed ? error : 'Connecting…'}
        </AppText>
      </View>

      <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 20 }}>
        {hasFailed ? (
          <Pressable
            onPress={() => void dial()}
            style={({ pressed }) => ({
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="body" weight="700" color="#FFFFFF">
              Try again
            </AppText>
          </Pressable>
        ) : null}

        <View style={{ alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={leave}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#E5484D',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="header" color="#FFFFFF">
              ✕
            </AppText>
          </Pressable>
          <AppText variant="bodySmall" color="rgba(255,255,255,0.7)">
            {hasFailed ? 'Close' : 'Cancel'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Env } from '@shared/config/env';

import type { JoinCallResponse } from '@features/calls/types/call-models';

/** Messages the call-app sends to this host. Mirrors mobile/lib/features/call_session/screen/parts/call_app_webview.dart. */
export type CallAppMessage =
  | { type: 'ready' }
  | { type: 'active' }
  | { type: 'ended'; reason: string; connectedSeconds: number }
  | { type: 'token-expiring' }
  | { type: 'permission-needed'; permission: string };

export interface CallAppWebViewHandle {
  sendJoin: (params: {
    joinData: JoinCallResponse;
    localName: string;
    localAvatarKey?: string;
    peerName: string;
    peerAvatarKey?: string;
    peerAgoraUid: number;
    callReference?: string;
    role: string;
    callType: string;
  }) => void;
  sendRenewToken: (params: { agoraToken: string; expiresAt: string }) => void;
  sendHangup: () => void;
}

export interface CallAppWebViewProps {
  onMessage: (msg: CallAppMessage) => void;
}

/**
 * Shimmed into the page before it runs so `window.parent.postMessage` works
 * inside a WebView (which has no real parent frame). Posts through
 * `window.ReactNativeWebView.postMessage`, react-native-webview's bridge.
 */
const PARENT_SHIM = `
(function() {
  if (window.__ohlifyShimInstalled) return;
  window.__ohlifyShimInstalled = true;
  window.parent = {
    postMessage: function(data) {
      try {
        var json = typeof data === 'string' ? data : JSON.stringify(data);
        window.ReactNativeWebView.postMessage(json);
      } catch (e) {}
    }
  };
  true;
})();
`;

/** Full-screen WebView that hosts the call-app React bundle and owns the postMessage bridge. */
export const CallAppWebView = forwardRef<CallAppWebViewHandle, CallAppWebViewProps>(function CallAppWebView({ onMessage }, ref) {
  const webViewRef = useRef<WebView | null>(null);

  const postMessage = useCallback((msg: Record<string, unknown>) => {
    const json = JSON.stringify(msg).replace(/'/g, "\\'");
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('${json}'), origin: '${Env.callAppUrl}' })); true;`,
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      sendJoin: ({ joinData, localName, localAvatarKey, peerName, peerAvatarKey, peerAgoraUid, callReference, role, callType }) => {
        postMessage({
          type: 'ca:join',
          payload: {
            call_id: joinData.callId,
            agora_channel: joinData.channel,
            agora_app_id: joinData.appId,
            agora_uid: joinData.uid,
            agora_token: joinData.agoraToken,
            expires_at: joinData.expiresAt,
            call_type: callType,
            role,
            local_name: localName,
            local_avatar_key: localAvatarKey ?? null,
            participants: [{ uid: peerAgoraUid, name: peerName, avatar_key: peerAvatarKey ?? null }],
            peer_name: peerName,
            peer_avatar_key: peerAvatarKey ?? null,
            session_token: null,
            call_reference: callReference ?? null,
            permissions: { microphone: 'granted', camera: 'granted' },
          },
        });
      },
      sendRenewToken: ({ agoraToken, expiresAt }) => {
        postMessage({ type: 'ca:renew-token', payload: { agora_token: agoraToken, expires_at: expiresAt } });
      },
      sendHangup: () => {
        postMessage({ type: 'ca:hangup' });
      },
    }),
    [postMessage],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: Record<string, unknown> };
        const payload = data.payload ?? {};
        switch (data.type) {
          case 'ca:ready':
            onMessage({ type: 'ready' });
            break;
          case 'ca:active':
            onMessage({ type: 'active' });
            break;
          case 'ca:ended':
            onMessage({ type: 'ended', reason: (payload.reason as string) ?? 'hangup', connectedSeconds: (payload.connected_seconds as number) ?? 0 });
            break;
          case 'ca:token-expiring':
            onMessage({ type: 'token-expiring' });
            break;
          case 'ca:permission-needed':
            onMessage({ type: 'permission-needed', permission: (payload.permission as string) ?? 'microphone' });
            break;
          default:
            break;
        }
      } catch {
        // Ignore malformed messages.
      }
    },
    [onMessage],
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: `${Env.callAppUrl}/call` }}
      injectedJavaScriptBeforeContentLoaded={PARENT_SHIM}
      onMessage={handleMessage}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
    />
  );
});

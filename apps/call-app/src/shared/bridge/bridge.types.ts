// ── Event identifiers ─────────────────────────────────────────────────────────

export const CA_EVENTS = {
  // Notifications (call-app → parent)
  READY:             'ca:ready',
  PHASE:             'ca:phase',
  JOINED:            'ca:joined',
  REMOTE_JOINED:     'ca:remote-joined',
  REMOTE_LEFT:       'ca:remote-left',
  ACTIVE:            'ca:active',
  MUTED:             'ca:muted',
  CAMERA_CHANGED:    'ca:camera-changed',
  NETWORK_QUALITY:   'ca:network-quality',
  TOKEN_EXPIRING:    'ca:token-expiring',
  TOKEN_RENEWED:     'ca:token-renewed',
  DURATION_WARNING:  'ca:duration-warning',
  DURATION_PAUSED:   'ca:duration-paused',
  DURATION_RESUMED:  'ca:duration-resumed',
  PERMISSION_NEEDED: 'ca:permission-needed',
  WARNING:           'ca:warning',
  ERROR:             'ca:error',
  ENDED:             'ca:ended',
  // Commands (parent → call-app)
  JOIN:              'ca:join',
  MUTE:              'ca:mute',
  CAMERA:            'ca:camera',
  SWITCH_CAMERA:     'ca:switch-camera',
  SPEAKER:           'ca:speaker',
  HANGUP:            'ca:hangup',
  RENEW_TOKEN:       'ca:renew-token',
  OVERLAY:           'ca:overlay',
  GRANT_PERMISSION:  'ca:grant-permission',
  PAUSE_DURATION:    'ca:pause-duration',
  RESUME_DURATION:   'ca:resume-duration',
  // Stream messaging (parent → call-app: send to peers; call-app → parent: received from peer)
  STREAM_SEND:       'ca:stream-send',
  STREAM_RECEIVED:   'ca:stream-received',
} as const;

export type CaEvent = (typeof CA_EVENTS)[keyof typeof CA_EVENTS];

// ── Domain enums ──────────────────────────────────────────────────────────────

export const CALL_TYPE = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;
export type CallType = (typeof CALL_TYPE)[keyof typeof CALL_TYPE];

export const CALL_ROLE = {
  CALLER: 'caller',
  CALLEE: 'callee',
} as const;
export type CallRole = (typeof CALL_ROLE)[keyof typeof CALL_ROLE];

export const CALL_PHASE = {
  WAITING:          'waiting',
  JOINING:          'joining',
  DIALING:          'dialing',
  CONNECTING:       'connecting',
  ACTIVE:           'active',
  ALONE:            'alone',
  ENDED:            'ended',
  ERROR:            'error',
  PERMISSION_ERROR: 'permission-error',
} as const;
export type CallPhase = (typeof CALL_PHASE)[keyof typeof CALL_PHASE];

export const END_REASON = {
  HANGUP:            'hangup',
  REMOTE_LEFT:       'remote-left',
  TOKEN_EXPIRED:     'token-expired',
  ERROR:             'error',
  DURATION_EXCEEDED: 'duration-exceeded',
} as const;
export type EndReason = (typeof END_REASON)[keyof typeof END_REASON];

export const PERMISSION_STATE = {
  GRANTED: 'granted',
  DENIED:  'denied',
  PROMPT:  'prompt',
} as const;
export type PermissionState = (typeof PERMISSION_STATE)[keyof typeof PERMISSION_STATE];

export const PERMISSION_KIND = {
  MICROPHONE: 'microphone',
  CAMERA:     'camera',
} as const;
export type PermissionKind = (typeof PERMISSION_KIND)[keyof typeof PERMISSION_KIND];

export const NETWORK_QUALITY_LEVEL = {
  UNKNOWN:   0,
  EXCELLENT: 1,
  GOOD:      2,
  POOR:      3,
  BAD:       4,
  VERY_BAD:  5,
  DOWN:      6,
} as const;
export type NetworkQualityLevel = (typeof NETWORK_QUALITY_LEVEL)[keyof typeof NETWORK_QUALITY_LEVEL];

export const OVERLAY_NAME = {
  NETWORK_WARNING: 'network-warning',
  RECONNECTING:    'reconnecting',
} as const;
export type OverlayName = (typeof OVERLAY_NAME)[keyof typeof OVERLAY_NAME];

// ── Permissions payload ───────────────────────────────────────────────────────

export interface CallPermissions {
  microphone: PermissionState;
  camera: PermissionState;
}

// ── Wire message types ────────────────────────────────────────────────────────
// All messages may carry an optional request_id for async request↔response.

interface BridgeBase {
  request_id?: string;
}

// Commands (parent → call-app)

export interface MsgJoin extends BridgeBase {
  type: typeof CA_EVENTS.JOIN;
  payload: {
    call_id: string;
    agora_app_id: string;
    agora_channel: string;
    agora_uid: number;
    agora_token: string;
    expires_at: string;
    call_type: CallType;
    role: CallRole;
    local_name: string;
    local_avatar_key: string | null;
    peer_name: string;
    peer_avatar_key: string | null;
    duration_minutes: number | null;
    permissions: CallPermissions;
  };
}

export interface MsgMute extends BridgeBase {
  type: typeof CA_EVENTS.MUTE;
  payload: { muted: boolean };
}

export interface MsgCamera extends BridgeBase {
  type: typeof CA_EVENTS.CAMERA;
  payload: { enabled: boolean };
}

export interface MsgSwitchCamera extends BridgeBase {
  type: typeof CA_EVENTS.SWITCH_CAMERA;
}

export interface MsgSpeaker extends BridgeBase {
  type: typeof CA_EVENTS.SPEAKER;
  payload: { enabled: boolean };
}

export interface MsgHangup extends BridgeBase {
  type: typeof CA_EVENTS.HANGUP;
}

export interface MsgRenewToken extends BridgeBase {
  type: typeof CA_EVENTS.RENEW_TOKEN;
  payload: { agora_token: string; expires_at: string };
}

export interface MsgOverlay extends BridgeBase {
  type: typeof CA_EVENTS.OVERLAY;
  payload: { name: OverlayName; visible: boolean };
}

export interface MsgGrantPermission extends BridgeBase {
  type: typeof CA_EVENTS.GRANT_PERMISSION;
  payload: { kind: PermissionKind };
}

export interface MsgPauseDuration extends BridgeBase {
  type: typeof CA_EVENTS.PAUSE_DURATION;
}

export interface MsgResumeDuration extends BridgeBase {
  type: typeof CA_EVENTS.RESUME_DURATION;
}

// Parent instructs call-app to broadcast a stream message to all channel peers.
// `msg_type` must be a valid STREAM_MSG value; `payload` is the message-specific data.
export interface MsgStreamSend extends BridgeBase {
  type: typeof CA_EVENTS.STREAM_SEND;
  payload: {
    msg_type: string;
    payload?: Record<string, unknown>;
  };
}

export type ParentToCallApp =
  | MsgJoin
  | MsgMute
  | MsgCamera
  | MsgSwitchCamera
  | MsgSpeaker
  | MsgHangup
  | MsgRenewToken
  | MsgOverlay
  | MsgGrantPermission
  | MsgPauseDuration
  | MsgResumeDuration
  | MsgStreamSend;

// Notifications (call-app → parent)

export interface MsgReady extends BridgeBase {
  type: typeof CA_EVENTS.READY;
}

export interface MsgPhase extends BridgeBase {
  type: typeof CA_EVENTS.PHASE;
  payload: { phase: CallPhase };
}

export interface CallParticipant {
  uid: number;
  name: string;
  avatar_key: string | null;
}

export interface MsgJoined extends BridgeBase {
  type: typeof CA_EVENTS.JOINED;
  payload: { uid: number };
}

export interface MsgRemoteJoined extends BridgeBase {
  type: typeof CA_EVENTS.REMOTE_JOINED;
  payload: {
    joined: CallParticipant;
    participants: CallParticipant[];
  };
}

export interface MsgRemoteLeft extends BridgeBase {
  type: typeof CA_EVENTS.REMOTE_LEFT;
  payload: {
    left: CallParticipant;
    remaining: CallParticipant[];
  };
}

export interface MsgActive extends BridgeBase {
  type: typeof CA_EVENTS.ACTIVE;
  payload: { connected_at: number };
}

export interface MsgMuted extends BridgeBase {
  type: typeof CA_EVENTS.MUTED;
  payload: { muted: boolean };
}

export interface MsgCameraChanged extends BridgeBase {
  type: typeof CA_EVENTS.CAMERA_CHANGED;
  payload: { enabled: boolean };
}

export interface MsgNetworkQuality extends BridgeBase {
  type: typeof CA_EVENTS.NETWORK_QUALITY;
  payload: { uplink: NetworkQualityLevel; downlink: NetworkQualityLevel };
}

export interface MsgTokenExpiring extends BridgeBase {
  type: typeof CA_EVENTS.TOKEN_EXPIRING;
  payload: { expires_at: string };
}

export interface MsgTokenRenewed extends BridgeBase {
  type: typeof CA_EVENTS.TOKEN_RENEWED;
}

export interface MsgDurationWarning extends BridgeBase {
  type: typeof CA_EVENTS.DURATION_WARNING;
  payload: { remaining_seconds: number };
}

export interface MsgDurationPaused extends BridgeBase {
  type: typeof CA_EVENTS.DURATION_PAUSED;
  payload: { elapsed_seconds: number };
}

export interface MsgDurationResumed extends BridgeBase {
  type: typeof CA_EVENTS.DURATION_RESUMED;
  payload: { elapsed_seconds: number };
}

export interface MsgPermissionNeeded extends BridgeBase {
  type: typeof CA_EVENTS.PERMISSION_NEEDED;
  payload: { kind: PermissionKind };
}

export interface MsgWarning extends BridgeBase {
  type: typeof CA_EVENTS.WARNING;
  payload: { code: number; message: string };
}

export interface MsgError extends BridgeBase {
  type: typeof CA_EVENTS.ERROR;
  payload: { code: string; message: string };
}

export interface MsgEnded extends BridgeBase {
  type: typeof CA_EVENTS.ENDED;
  payload: {
    reason: EndReason;
    connected_at: number | null;
    connected_seconds: number;
  };
}

// Emitted when a stream message arrives from a peer and is marked for parent forwarding.
export interface MsgStreamReceived extends BridgeBase {
  type: typeof CA_EVENTS.STREAM_RECEIVED;
  payload: {
    from_uid: number;
    msg_type: string;
    data: Record<string, unknown>;
  };
}

export type CallAppToParent =
  | MsgReady
  | MsgPhase
  | MsgJoined
  | MsgRemoteJoined
  | MsgRemoteLeft
  | MsgActive
  | MsgMuted
  | MsgCameraChanged
  | MsgNetworkQuality
  | MsgTokenExpiring
  | MsgTokenRenewed
  | MsgDurationWarning
  | MsgDurationPaused
  | MsgDurationResumed
  | MsgPermissionNeeded
  | MsgWarning
  | MsgError
  | MsgEnded
  | MsgStreamReceived;

export type BridgeMessage = ParentToCallApp | CallAppToParent;

// Peer-to-peer stream messages sent over Agora DataChannel.
// Max payload: 512 bytes total. Keep payloads tiny.

export const STREAM_MSG = {
  MUTE: 'sm:mute', // { muted: boolean }
  CAMERA: 'sm:camera', // { enabled: boolean }
  SPEAKING: 'sm:speaking', // {} — sender started speaking
  SPEAKING_STOPPED: 'sm:speaking-stopped', // {} — sender stopped speaking
  REACTION: 'sm:reaction', // { emoji: string }
  CUSTOM: 'sm:custom', // { key: string; value?: string }
} as const;

export type StreamMsgType = (typeof STREAM_MSG)[keyof typeof STREAM_MSG];

// ── Typed payloads ────────────────────────────────────────────────────────────

export interface StreamMsgMute {
  type: typeof STREAM_MSG.MUTE;
  uid: number;
  muted: boolean;
}
export interface StreamMsgCamera {
  type: typeof STREAM_MSG.CAMERA;
  uid: number;
  enabled: boolean;
}
export interface StreamMsgSpeaking {
  type: typeof STREAM_MSG.SPEAKING;
  uid: number;
}
export interface StreamMsgSpeakingStopped {
  type: typeof STREAM_MSG.SPEAKING_STOPPED;
  uid: number;
}
export interface StreamMsgReaction {
  type: typeof STREAM_MSG.REACTION;
  uid: number;
  emoji: string;
}
export interface StreamMsgCustom {
  type: typeof STREAM_MSG.CUSTOM;
  uid: number;
  key: string;
  value?: string;
}

export type StreamMessage =
  | StreamMsgMute
  | StreamMsgCamera
  | StreamMsgSpeaking
  | StreamMsgSpeakingStopped
  | StreamMsgReaction
  | StreamMsgCustom;

// Which stream message types are forwarded up to the parent shell as ca:stream-received.
export const STREAM_FORWARD_TO_PARENT = new Set<StreamMsgType>([
  STREAM_MSG.MUTE,
  STREAM_MSG.CAMERA,
  STREAM_MSG.REACTION,
  STREAM_MSG.CUSTOM,
  // Speaking events are intentionally NOT forwarded — they're UI-only signals.
]);

/** Mobile parity: scheduled_call_item.dart::CallType. */
export type CallType = 'video' | 'audio';

/** Mobile parity: call_detail.dart::CallStatus. */
export type CallStatus = 'upcoming' | 'completed' | 'missed';

/** Mobile parity: call_session.dart. */
export type CallRole = 'caller' | 'callee';
export type CallEndReason = 'hangup' | 'declined' | 'missed' | 'error';

export type CallPhase =
  | { kind: 'dialing' }
  | { kind: 'incoming' }
  | { kind: 'connecting' }
  | { kind: 'active'; connectedAt: Date }
  | { kind: 'ended'; reason: CallEndReason; connectedAt?: Date; endedAt?: Date };

export interface CallSessionConfig {
  sessionId: string;
  kind: CallType;
  role: CallRole;
  selfId: string;
  peerId: string;
  peerName: string;
  peerRole: string;
  peerAvatarUrl?: string;
  selfAvatarUrl?: string;
}

export const isVideo = (cfg: CallSessionConfig): boolean => cfg.kind === 'video';

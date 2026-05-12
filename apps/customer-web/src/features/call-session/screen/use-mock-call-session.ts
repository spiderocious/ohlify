import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { CallRole, CallType } from '@ohlify/core';

export type CallPhaseTag = 'dialing' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallPhase {
  tag: CallPhaseTag;
  connectedAt?: number;
  endedAt?: number;
}

export type CallEndReason = 'hangup' | 'declined' | 'error';

interface State {
  phase: CallPhase;
  muted: boolean;
  speakerOn: boolean;
  cameraEnabled: boolean;
  /** Forces a re-render every second while active for the elapsed label. */
  tick: number;
}

type Action =
  | { type: 'connect' }
  | { type: 'remoteJoined' }
  | { type: 'end'; reason: CallEndReason }
  | { type: 'toggleMute' }
  | { type: 'toggleSpeaker' }
  | { type: 'toggleCamera' }
  | { type: 'tick' };

function init(role: CallRole): State {
  return {
    phase: { tag: role === 'caller' ? 'dialing' : 'incoming' },
    muted: false,
    speakerOn: false,
    cameraEnabled: true,
    tick: 0,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'connect':
      if (state.phase.tag !== 'dialing' && state.phase.tag !== 'incoming') return state;
      return { ...state, phase: { tag: 'connecting' } };
    case 'remoteJoined':
      if (state.phase.tag !== 'connecting') return state;
      return { ...state, phase: { tag: 'active', connectedAt: Date.now() } };
    case 'end':
      if (state.phase.tag === 'ended') return state;
      return {
        ...state,
        phase: {
          tag: 'ended',
          ...(state.phase.connectedAt !== undefined
            ? { connectedAt: state.phase.connectedAt }
            : {}),
          endedAt: Date.now(),
        },
      };
    case 'toggleMute':
      return { ...state, muted: !state.muted };
    case 'toggleSpeaker':
      return { ...state, speakerOn: !state.speakerOn };
    case 'toggleCamera':
      return { ...state, cameraEnabled: !state.cameraEnabled };
    case 'tick':
      return { ...state, tick: state.tick + 1 };
  }
}

interface Options {
  role: CallRole;
  /** ms — caller auto-flips to connecting to mimic the callee accepting. */
  autoAcceptAfter?: number;
  /** ms — once connecting, simulate the engine reporting remote-joined. */
  autoConnectAfter?: number;
}

/**
 * React equivalent of mobile's CallSessionNotifier + MockCallEngine.
 * Owns timers + transitions; exposes phase + flags + controls.
 */
export function useMockCallSession({
  role,
  autoAcceptAfter = 3000,
  autoConnectAfter = 1500,
}: Options) {
  const [state, dispatch] = useReducer(reducer, role, init);
  const timersRef = useRef<{ accept?: ReturnType<typeof setTimeout>; connect?: ReturnType<typeof setTimeout> }>(
    {},
  );

  useEffect(() => {
    // Caller: simulate the callee accepting after a short delay.
    if (state.phase.tag === 'dialing' && role === 'caller' && autoAcceptAfter > 0) {
      timersRef.current.accept = setTimeout(() => dispatch({ type: 'connect' }), autoAcceptAfter);
    }
    // Connecting: simulate remote join.
    if (state.phase.tag === 'connecting') {
      timersRef.current.connect = setTimeout(
        () => dispatch({ type: 'remoteJoined' }),
        autoConnectAfter,
      );
    }
    return () => {
      const t = timersRef.current;
      if (t.accept) clearTimeout(t.accept);
      if (t.connect) clearTimeout(t.connect);
      timersRef.current = {};
    };
  }, [state.phase.tag, role, autoAcceptAfter, autoConnectAfter]);

  // Active: tick every second so consumers can render an elapsed label.
  useEffect(() => {
    if (state.phase.tag !== 'active') return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [state.phase.tag]);

  const accept = useCallback(() => dispatch({ type: 'connect' }), []);
  const hangup = useCallback(
    () => dispatch({ type: 'end', reason: state.phase.tag === 'incoming' ? 'declined' : 'hangup' }),
    [state.phase.tag],
  );
  const toggleMute = useCallback(() => dispatch({ type: 'toggleMute' }), []);
  const toggleSpeaker = useCallback(() => dispatch({ type: 'toggleSpeaker' }), []);
  const toggleCamera = useCallback(() => dispatch({ type: 'toggleCamera' }), []);

  const elapsed = state.phase.connectedAt
    ? Math.max(
        0,
        Math.floor(((state.phase.endedAt ?? Date.now()) - state.phase.connectedAt) / 1000),
      )
    : 0;

  return {
    phase: state.phase,
    muted: state.muted,
    speakerOn: state.speakerOn,
    cameraEnabled: state.cameraEnabled,
    elapsed,
    elapsedLabel: formatElapsed(elapsed),
    accept,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
  };
}

function formatElapsed(seconds: number): string {
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export type CallSessionController = ReturnType<typeof useMockCallSession>;
export type { CallType };

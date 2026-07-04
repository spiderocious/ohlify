import { useState } from 'react';
import { CA_EVENTS, PERMISSION_STATE, type ParentToCallApp } from '@shared/bridge/bridge.types.js';

interface Props {
  onSend: (msg: ParentToCallApp) => void;
  sessionId: string;
  agoraAppId: string;
  agoraChannel: string;
  uid: number;
  agoraToken: string;
  expiresAt: string;
  callType: 'audio' | 'video';
}

export function CommandPanel({
  onSend,
  sessionId,
  agoraAppId,
  agoraChannel,
  uid,
  agoraToken,
  expiresAt,
  callType,
}: Props) {
  const [muteNext, setMuteNext] = useState(true);
  const [cameraNext, setCameraNext] = useState(false);

  const sendJoin = () => {
    onSend({
      type: CA_EVENTS.JOIN,
      payload: {
        call_id: sessionId,
        call_reference: null,
        session_token: null,
        agora_app_id: agoraAppId,
        agora_channel: agoraChannel,
        agora_uid: uid,
        agora_token: agoraToken,
        expires_at: expiresAt,
        call_type: callType,
        role: 'caller',
        local_name: 'Party A',
        local_avatar_key: null,
        participants: [{ uid: 0, name: 'Test Peer', avatar_key: null }],
        peer_name: 'Test Peer',
        peer_avatar_key: null,
        duration_minutes: 30,
        permissions: { microphone: PERMISSION_STATE.GRANTED, camera: PERMISSION_STATE.GRANTED },
      },
    });
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Commands</h2>
      <div className="flex flex-wrap gap-2">
        <Cmd label="Send ca:join" onClick={sendJoin} color="indigo" />
        <Cmd label="Hangup" onClick={() => onSend({ type: CA_EVENTS.HANGUP })} color="red" />
        <Cmd
          label={muteNext ? 'Mute' : 'Unmute'}
          onClick={() => {
            onSend({ type: CA_EVENTS.MUTE, payload: { muted: muteNext } });
            setMuteNext(!muteNext);
          }}
          color="zinc"
        />
        <Cmd
          label={cameraNext ? 'Cam off' : 'Cam on'}
          onClick={() => {
            onSend({ type: CA_EVENTS.CAMERA, payload: { enabled: !cameraNext } });
            setCameraNext(!cameraNext);
          }}
          color="zinc"
        />
        <Cmd
          label="Switch cam"
          onClick={() => onSend({ type: CA_EVENTS.SWITCH_CAMERA })}
          color="zinc"
        />
      </div>
    </div>
  );
}

function Cmd({
  label,
  onClick,
  color,
}: {
  label: string;
  onClick: () => void;
  color: 'indigo' | 'red' | 'zinc';
}) {
  const cls =
    color === 'indigo'
      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
      : color === 'red'
        ? 'bg-red-700 hover:bg-red-600 text-white'
        : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200';
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}

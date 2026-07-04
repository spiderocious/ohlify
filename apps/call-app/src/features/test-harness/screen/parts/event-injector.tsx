import { useState } from 'react';
import { CA_EVENTS, type ParentToCallApp } from '@shared/bridge/bridge.types.js';

// Default payloads for every injectable command.
const INJECTABLE_COMMANDS: { label: string; event: string; defaultPayload: object | null }[] = [
  { label: 'ca:mute (mute)', event: CA_EVENTS.MUTE, defaultPayload: { muted: true } },
  { label: 'ca:mute (unmute)', event: CA_EVENTS.MUTE, defaultPayload: { muted: false } },
  { label: 'ca:camera (off)', event: CA_EVENTS.CAMERA, defaultPayload: { enabled: false } },
  { label: 'ca:camera (on)', event: CA_EVENTS.CAMERA, defaultPayload: { enabled: true } },
  { label: 'ca:switch-camera', event: CA_EVENTS.SWITCH_CAMERA, defaultPayload: null },
  { label: 'ca:speaker (off)', event: CA_EVENTS.SPEAKER, defaultPayload: { enabled: false } },
  { label: 'ca:speaker (on)', event: CA_EVENTS.SPEAKER, defaultPayload: { enabled: true } },
  { label: 'ca:hangup', event: CA_EVENTS.HANGUP, defaultPayload: null },
  {
    label: 'ca:renew-token',
    event: CA_EVENTS.RENEW_TOKEN,
    defaultPayload: { agora_token: '', expires_at: new Date(Date.now() + 3600_000).toISOString() },
  },
  {
    label: 'ca:overlay (show network-warning)',
    event: CA_EVENTS.OVERLAY,
    defaultPayload: { name: 'network-warning', visible: true },
  },
  {
    label: 'ca:overlay (hide network-warning)',
    event: CA_EVENTS.OVERLAY,
    defaultPayload: { name: 'network-warning', visible: false },
  },
  {
    label: 'ca:overlay (show reconnecting)',
    event: CA_EVENTS.OVERLAY,
    defaultPayload: { name: 'reconnecting', visible: true },
  },
  {
    label: 'ca:grant-permission (mic)',
    event: CA_EVENTS.GRANT_PERMISSION,
    defaultPayload: { kind: 'microphone' },
  },
  {
    label: 'ca:grant-permission (cam)',
    event: CA_EVENTS.GRANT_PERMISSION,
    defaultPayload: { kind: 'camera' },
  },
  { label: 'ca:pause-duration', event: CA_EVENTS.PAUSE_DURATION, defaultPayload: null },
  { label: 'ca:resume-duration', event: CA_EVENTS.RESUME_DURATION, defaultPayload: null },
  {
    label: 'ca:stream-send (mute)',
    event: CA_EVENTS.STREAM_SEND,
    defaultPayload: { msg_type: 'sm:mute', payload: { muted: true } },
  },
  {
    label: 'ca:stream-send (unmute)',
    event: CA_EVENTS.STREAM_SEND,
    defaultPayload: { msg_type: 'sm:mute', payload: { muted: false } },
  },
  {
    label: 'ca:stream-send (camera off)',
    event: CA_EVENTS.STREAM_SEND,
    defaultPayload: { msg_type: 'sm:camera', payload: { enabled: false } },
  },
  {
    label: 'ca:stream-send (reaction)',
    event: CA_EVENTS.STREAM_SEND,
    defaultPayload: { msg_type: 'sm:reaction', payload: { emoji: '👍' } },
  },
  {
    label: 'ca:stream-send (custom)',
    event: CA_EVENTS.STREAM_SEND,
    defaultPayload: { msg_type: 'sm:custom', payload: { key: 'ping', value: 'hello' } },
  },
];

interface Props {
  onSend: (msg: ParentToCallApp) => void;
}

export function EventInjector({ onSend }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(INJECTABLE_COMMANDS[0]!.defaultPayload, null, 2) ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    const cmd = INJECTABLE_COMMANDS[idx]!;
    setPayloadText(cmd.defaultPayload !== null ? JSON.stringify(cmd.defaultPayload, null, 2) : '');
    setError(null);
  };

  const handleSend = () => {
    const cmd = INJECTABLE_COMMANDS[selectedIdx]!;
    let payload: object | null = null;
    if (payloadText.trim()) {
      try {
        payload = JSON.parse(payloadText) as object;
      } catch {
        setError('Invalid JSON');
        return;
      }
    }
    setError(null);
    const msg =
      payload !== null
        ? ({ type: cmd.event, payload } as unknown as ParentToCallApp)
        : ({ type: cmd.event } as unknown as ParentToCallApp);
    onSend(msg);
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Inject Event</p>

      <select
        value={selectedIdx}
        onChange={(e) => handleSelect(Number(e.target.value))}
        className="w-full bg-zinc-700 text-white text-xs rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {INJECTABLE_COMMANDS.map((cmd, i) => (
          <option key={i} value={i}>
            {cmd.label}
          </option>
        ))}
      </select>

      {payloadText !== '' && (
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={4}
          spellCheck={false}
          className="w-full bg-zinc-900 text-zinc-200 text-xs font-mono rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSend}
        className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors"
      >
        Send
      </button>
    </div>
  );
}

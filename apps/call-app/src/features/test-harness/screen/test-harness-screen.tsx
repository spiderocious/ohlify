import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CA_EVENTS,
  PERMISSION_STATE,
  type BridgeMessage,
  type MsgJoin,
  type ParentToCallApp,
} from '@shared/bridge/index.js';
import { env } from '@shared/config/env.js';
import type { MintedSession } from '../api/use-mint-test-session.js';
import { SessionMinter } from './parts/session-minter.js';
import { CallFrame } from './parts/call-frame.js';
import { EventLog, type LogEntry } from './parts/event-log.js';
import { EventInjector } from './parts/event-injector.js';

let _logId = 0;

function buildJoinMsg(
  session: MintedSession,
  party: 'a' | 'b',
  durationMinutes: number | null,
): MsgJoin {
  const p = session[`party_${party}`];
  const peer = session[`party_${party === 'a' ? 'b' : 'a'}`];
  return {
    type: CA_EVENTS.JOIN,
    payload: {
      call_id: session.session_id,
      agora_app_id: env.VITE_AGORA_APP_ID,
      agora_channel: session.channel,
      agora_uid: p.uid,
      agora_token: p.agora_token,
      expires_at: p.token_expires_at,
      call_type: session.call_type,
      role: party === 'a' ? 'caller' : 'callee',
      local_name: p.name,
      local_avatar_key: p.avatar_url,
      peer_name: peer.name,
      peer_avatar_key: peer.avatar_url,
      duration_minutes: durationMinutes,
      permissions: {
        microphone: PERMISSION_STATE.GRANTED,
        camera: PERMISSION_STATE.GRANTED,
      },
    },
  };
}

function partyBUrl(session: MintedSession) {
  const b = session.party_b;
  const params = new URLSearchParams({
    session: session.session_id,
    party: 'b',
    auto: '1',
    name_b: b.name,
    avatar_b: b.avatar_url ?? '',
    name_a: session.party_a.name,
    avatar_a: session.party_a.avatar_url ?? '',
  });
  return `${window.location.origin}/test?${params.toString()}`;
}

function PartyBPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Party B</p>
      <p className="text-xs text-zinc-400 break-all font-mono">{url}</p>
      <button
        onClick={copy}
        className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-semibold text-white transition-colors"
      >
        {copied ? 'Copied!' : 'Copy Party B link'}
      </button>
    </div>
  );
}

export function TestHarnessScreen() {
  const searchParams = new URLSearchParams(window.location.search);
  const autoParty = searchParams.get('party') as 'a' | 'b' | null;
  const isAutoMode = searchParams.get('auto') === '1' && autoParty != null;

  // In auto mode, read participant names/avatars from URL params.
  const urlNameB = searchParams.get('name_b') ?? '';
  const urlAvatarB = searchParams.get('avatar_b') ?? '';
  const urlNameA = searchParams.get('name_a') ?? '';
  const urlAvatarA = searchParams.get('avatar_a') ?? '';

  const [session, setSession] = useState<MintedSession | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [joined, setJoined] = useState(false);
  const [openEnded, setOpenEnded] = useState(false);
  // Party B popup: collect name before auto-joining (pre-filled from URL params).
  const [partyBName, setPartyBName] = useState(urlNameB);
  const [partyBAvatar, setPartyBAvatar] = useState(urlAvatarB);
  const [partyBReady, setPartyBReady] = useState(!!urlNameB);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const party: 'a' | 'b' = isAutoMode ? (autoParty ?? 'a') : 'a';
  const pendingReadyRef = useRef(false);

  const appendLog = useCallback((direction: 'in' | 'out', type: string, payload?: unknown) => {
    setLog((prev) => [...prev, { id: ++_logId, ts: Date.now(), direction, type, payload }]);
  }, []);

  // In auto mode: fetch session tokens from backend, then build synthetic MintedSession.
  useEffect(() => {
    if (!isAutoMode || !partyBReady) return;
    const sessionId = searchParams.get('session');
    if (!sessionId) return;

    fetch(`${env.VITE_BACKEND_URL}/api/v1/dev/call-sessions/${sessionId}/${autoParty}`)
      .then((r) => r.json())
      .then((json: { data?: { session_id: string; channel: string; call_type: 'audio' | 'video'; duration_minutes: number; uid: number; agora_token: string; token_expires_at: string; peer_uid: number } }) => {
        if (!json.data) return;
        const d = json.data;
        const myName = autoParty === 'b' ? partyBName : urlNameA;
        const myAvatar = autoParty === 'b' ? (partyBAvatar || null) : (urlAvatarA || null);
        const peerName = autoParty === 'b' ? urlNameA : partyBName;
        const peerAvatar = autoParty === 'b' ? (urlAvatarA || null) : (partyBAvatar || null);

        const syntheticSession: MintedSession = {
          session_id: d.session_id,
          channel: d.channel,
          call_type: d.call_type,
          duration_minutes: d.duration_minutes,
          label: null,
          expires_at: d.token_expires_at,
          party_a: autoParty === 'a'
            ? { uid: d.uid, agora_token: d.agora_token, token_expires_at: d.token_expires_at, name: myName, avatar_url: myAvatar }
            : { uid: d.peer_uid, agora_token: '', token_expires_at: '', name: peerName, avatar_url: peerAvatar },
          party_b: autoParty === 'b'
            ? { uid: d.uid, agora_token: d.agora_token, token_expires_at: d.token_expires_at, name: myName, avatar_url: myAvatar }
            : { uid: d.peer_uid, agora_token: '', token_expires_at: '', name: peerName, avatar_url: peerAvatar },
        };
        setSession(syntheticSession);
        if (pendingReadyRef.current && !joined) {
          pendingReadyRef.current = false;
          setJoined(true);
          const joinMsg = buildJoinMsg(syntheticSession, party, syntheticSession.duration_minutes);
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(joinMsg, '*');
          }, 100);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyBReady]);

  // Listen for events from the iframe.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const m = event.data as BridgeMessage & { payload?: unknown };
      if (typeof m.type !== 'string' || !m.type.startsWith('ca:')) return;
      appendLog('in', m.type, 'payload' in m ? m.payload : undefined);

      if (m.type === CA_EVENTS.READY && !joined) {
        if (session) {
          setJoined(true);
          const joinMsg = buildJoinMsg(session, party, openEnded ? null : session.duration_minutes);
          iframeRef.current?.contentWindow?.postMessage(joinMsg, '*');
          const { type, ...rest } = joinMsg as { type: string; payload?: unknown };
          appendLog('out', type, (rest as { payload?: unknown }).payload);
        } else {
          pendingReadyRef.current = true;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [appendLog, session, joined, party, openEnded]);

  const sendCommand = useCallback((msg: ParentToCallApp) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
    const { type, ...rest } = msg as { type: string; payload?: unknown };
    appendLog('out', type, (rest as { payload?: unknown }).payload);
  }, [appendLog]);

  const sendHangup = () => sendCommand({ type: CA_EVENTS.HANGUP });

  const handleMinted = (s: MintedSession) => {
    setSession(s);
    setJoined(false);
    setLog([]);
  };

  const callSrc = session ? `${window.location.origin}/call` : null;

  // Auto-mode: show name/avatar form if not pre-filled from URL.
  if (isAutoMode && !partyBReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-zinc-800 rounded-xl p-6 space-y-4 w-full max-w-sm">
          <h2 className="text-base font-semibold text-white">Join as Party B</h2>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Your name *</label>
            <input
              type="text"
              value={partyBName}
              onChange={(e) => setPartyBName(e.target.value)}
              placeholder="Required"
              className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Avatar URL (optional)</label>
            <input
              type="text"
              value={partyBAvatar}
              onChange={(e) => setPartyBAvatar(e.target.value)}
              placeholder="https://…"
              className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-500"
            />
          </div>
          <button
            disabled={!partyBName.trim()}
            onClick={() => setPartyBReady(true)}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold text-white transition-colors"
          >
            Join call
          </button>
        </div>
      </div>
    );
  }

  if (isAutoMode && !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Loading session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {isAutoMode ? `Test Harness — Party ${party.toUpperCase()}` : 'Call App — Test Harness'}
        </h1>
        {session && !isAutoMode && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">
              {session.call_type} · {session.duration_minutes}m
              {session.label ? ` · ${session.label}` : ''}
            </span>
            <button
              onClick={() => { setSession(null); setLog([]); setJoined(false); }}
              className="text-zinc-500 hover:text-red-400 text-xs"
            >
              ← New session
            </button>
          </div>
        )}
      </div>

      {!session ? (
        <SessionMinter onMinted={handleMinted} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Party {party.toUpperCase()} {joined ? '· Joined' : '· Waiting for ready…'}
            </p>
            {callSrc && <CallFrame ref={iframeRef} src={callSrc} />}
          </div>

          <div className="flex flex-col gap-4">
            {!isAutoMode && <PartyBPanel url={partyBUrl(session)} />}

            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Controls</p>
              {!isAutoMode && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={openEnded}
                    onChange={(e) => setOpenEnded(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-zinc-300">Open-ended (no total duration)</span>
                </label>
              )}
              <button
                onClick={sendHangup}
                className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
              >
                Hangup
              </button>
            </div>

            <EventInjector onSend={sendCommand} />

            <div className="bg-zinc-800 rounded-xl p-4 space-y-2 flex-1 flex flex-col">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Event Log</p>
              <div className="flex-1">
                <EventLog entries={log} />
              </div>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="text-xs text-zinc-500 hover:text-zinc-300 text-left">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

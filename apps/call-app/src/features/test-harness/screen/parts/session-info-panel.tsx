import type { MintedSession } from '../../api/use-mint-test-session.js';

interface Props {
  session: MintedSession;
  activeParty: 'a' | 'b';
  onSwitchParty: (p: 'a' | 'b') => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const copy = () => { void navigator.clipboard.writeText(value); };
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-zinc-400 w-24 shrink-0">{label}</span>
      <span className="text-zinc-200 font-mono truncate flex-1">{value}</span>
      <button onClick={copy} className="text-indigo-400 hover:text-indigo-300 shrink-0">Copy</button>
    </div>
  );
}

export function SessionInfoPanel({ session, activeParty, onSwitchParty }: Props) {
  const partyLink = (p: 'a' | 'b') =>
    `${window.location.origin}/call?session=${session.session_id}&party=${p}`;

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Session</h2>

      <CopyField label="Session ID" value={session.session_id} />
      <CopyField label="Channel" value={session.channel} />
      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>Type:</span>
        <span className="text-zinc-200">{session.call_type}</span>
        <span className="ml-3">Duration:</span>
        <span className="text-zinc-200">{session.duration_minutes}m</span>
        {session.label && <><span className="ml-3">Label:</span><span className="text-zinc-200">{session.label}</span></>}
      </div>

      <div className="border-t border-zinc-700 pt-3 space-y-2">
        <div className="flex gap-2">
          {(['a', 'b'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onSwitchParty(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activeParty === p ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
            >
              Party {p.toUpperCase()}
            </button>
          ))}
        </div>
        <CopyField label="Link" value={partyLink(activeParty)} />
        <CopyField label="UID" value={String(session[`party_${activeParty}`].uid)} />
      </div>
    </div>
  );
}

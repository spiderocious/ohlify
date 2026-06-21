import { useState } from 'react';
import { useMintTestSession, type MintedSession } from '../../api/use-mint-test-session.js';

interface Props {
  onMinted: (session: MintedSession) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-400 w-24 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-500"
    />
  );
}

export function SessionMinter({ onMinted }: Props) {
  const { mint, loading, error } = useMintTestSession();
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [duration, setDuration] = useState(30);
  const [label, setLabel] = useState('');
  const [nameA, setNameA] = useState('');
  const [avatarA, setAvatarA] = useState('');
  const [nameB, setNameB] = useState('');
  const [avatarB, setAvatarB] = useState('');

  const handleMint = async () => {
    if (!nameA.trim() || !nameB.trim()) return;
    const session = await mint({ call_type: callType, duration_minutes: duration, label: label || undefined });
    if (!session) return;
    // Attach participant metadata locally — the backend doesn't store names.
    const enriched: MintedSession = {
      ...session,
      party_a: { ...session.party_a, name: nameA.trim(), avatar_url: avatarA.trim() || null },
      party_b: { ...session.party_b, name: nameB.trim(), avatar_url: avatarB.trim() || null },
    };
    onMinted(enriched);
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Mint Session</h2>

      <div className="flex gap-2">
        {(['audio', 'video'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setCallType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${callType === t ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400 w-24 shrink-0">Duration (min)</label>
        <input
          type="number"
          min={1}
          max={120}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-20 bg-zinc-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Field label="Label">
        <TextInput value={label} onChange={setLabel} placeholder="Optional" />
      </Field>

      <div className="border-t border-zinc-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Party A</p>
        <Field label="Name *">
          <TextInput value={nameA} onChange={setNameA} placeholder="Required" required />
        </Field>
        <Field label="Avatar URL">
          <TextInput value={avatarA} onChange={setAvatarA} placeholder="https://… (optional)" />
        </Field>
      </div>

      <div className="border-t border-zinc-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Party B</p>
        <Field label="Name *">
          <TextInput value={nameB} onChange={setNameB} placeholder="Required" required />
        </Field>
        <Field label="Avatar URL">
          <TextInput value={avatarB} onChange={setAvatarB} placeholder="https://… (optional)" />
        </Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {(!nameA.trim() || !nameB.trim()) && (
        <p className="text-xs text-yellow-500">Both party names are required.</p>
      )}

      <button
        onClick={handleMint}
        disabled={loading || !nameA.trim() || !nameB.trim()}
        className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold text-white transition-colors"
      >
        {loading ? 'Minting...' : 'Mint Call Session'}
      </button>
    </div>
  );
}

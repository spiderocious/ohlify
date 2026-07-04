import { useEffect, useRef } from 'react';

export interface LogEntry {
  id: number;
  ts: number;
  direction: 'in' | 'out';
  type: string;
  payload?: unknown;
}

interface Props {
  entries: LogEntry[];
}

function formatTime(ts: number): string {
  return new Date(ts).toISOString().substring(11, 23);
}

export function EventLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="bg-zinc-900 rounded-xl p-3 flex flex-col gap-0.5 overflow-y-auto max-h-64 font-mono text-xs">
      {entries.length === 0 && <span className="text-zinc-600">No events yet…</span>}
      {entries.map((e) => (
        <div key={e.id} className="flex gap-2 leading-5">
          <span className="text-zinc-600 shrink-0">{formatTime(e.ts)}</span>
          <span
            className={e.direction === 'in' ? 'text-cyan-400 shrink-0' : 'text-yellow-400 shrink-0'}
          >
            {e.direction === 'in' ? '↓' : '↑'}
          </span>
          <span className="text-zinc-200">{e.type}</span>
          {e.payload !== null && (
            <span className="text-zinc-500 truncate">{JSON.stringify(e.payload)}</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

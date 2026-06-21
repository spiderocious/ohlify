import { useEffect, useState } from 'react';

interface Props {
  connectedAt: number;
  durationMinutes: number | null;
  accumulatedPausedMs: number;
  paused: boolean;
  className?: string;
}

function formatHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function DurationCountdown({ connectedAt, durationMinutes, accumulatedPausedMs, paused, className }: Props) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const effectiveElapsed = Math.max(0, Math.floor((now - connectedAt - accumulatedPausedMs) / 1000));
  const total = durationMinutes != null ? durationMinutes * 60 : null;
  const isWarning = total != null && Math.max(0, total - effectiveElapsed) <= 60;

  return (
    <span className={[
      isWarning ? 'text-red-400 font-semibold' : '',
      paused ? 'opacity-50' : '',
      className ?? 'text-zinc-300',
    ].filter(Boolean).join(' ')}>
      {formatHms(effectiveElapsed)}
      {total != null && ` / ${formatHms(total)}`}
      {paused && <span className="ml-1 text-xs text-yellow-400">(paused)</span>}
    </span>
  );
}

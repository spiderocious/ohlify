'use client';

import {
  IconCheckCircle,
  IconMic,
  IconPhoneOff,
  IconStar,
  IconVideo,
  IconArrowRight,
} from '@icons';

import professionals from '@/data/professionals.json';

import { ProfessionalTile } from '../marketing/professional-tile';

import {
  formatElapsed,
  formatNaira,
  SLOTS,
  type DemoAction,
  type DemoState,
} from './demo-state';

/* ─── Helpers ─────────────────────────────────────────────────────── */

const findProfessional = (id: string | null) =>
  professionals.find((p) => p.id === id) ?? null;

interface PanelProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

/* ─── Panels ──────────────────────────────────────────────────────── */

export function HomePanel({ dispatch }: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex items-baseline justify-between px-5 pb-4 pt-7">
        <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-ink">
          Discover
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-elev px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          247 online
        </span>
      </header>
      <div className="flex flex-col gap-3 overflow-y-auto px-3 pb-4">
        {professionals.map((p) => (
          <ProfessionalTile
            key={p.id}
            name={p.name}
            role={p.role}
            tagline={p.tagline}
            rating={p.rating}
            reviewCount={p.reviewCount}
            avatarTone={p.avatarTone}
            variant="cta"
            onTap={() => dispatch({ type: 'select_pro', proId: p.id })}
          />
        ))}
      </div>
    </div>
  );
}

export function DetailsPanel({ state, dispatch }: PanelProps) {
  const professional = findProfessional(state.proId);
  if (!professional) return null;
  return (
    <div className="flex h-full flex-col bg-paper-elev">
      <div className="flex items-center justify-between px-5 pb-2 pt-7">
        <button
          type="button"
          onClick={() => dispatch({ type: 'back_to_home' })}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          ← Back
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Profile
        </span>
      </div>
      <div className="px-5 pt-2">
        <p className="font-display text-[24px] font-medium leading-tight text-ink">
          {professional.name}
        </p>
        <p className="mt-1 text-[12px] text-muted">{professional.role}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[11px]">
          <IconStar size={12} className="text-highlight" fill="currentColor" />
          <span className="font-semibold text-ink">
            {professional.rating.toFixed(1)}
          </span>
          <span className="text-muted">
            · {professional.reviewCount} reviews
          </span>
        </p>
      </div>
      <div className="mt-5 border-t border-paper-line px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Rates
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {professional.rates.map((r) => (
          <button
            type="button"
            key={`${r.kind}-${r.minutes}`}
            onClick={() =>
              dispatch({
                type: 'select_rate',
                kind: r.kind as 'audio' | 'video',
                minutes: r.minutes,
                naira: r.naira,
              })
            }
            className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3.5 text-left transition-colors hover:bg-paper-line/30"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-paper">
                {r.kind === 'video' ? <IconVideo size={15} /> : <IconMic size={15} />}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">
                  {r.kind === 'video' ? 'Video' : 'Audio'} · {r.minutes} min
                </span>
                <span className="block text-[11px] text-muted">
                  Talk in real time
                </span>
              </span>
            </span>
            <span className="font-display text-[16px] font-medium text-ink">
              {formatNaira(r.naira)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SchedulePanel({ state, dispatch }: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-paper-elev">
      <div className="flex items-center justify-between px-5 pb-2 pt-7">
        <button
          type="button"
          onClick={() => dispatch({ type: 'back_to_home' })}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          ← Back
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Schedule
        </span>
      </div>
      <div className="px-5 pt-2">
        <p className="font-display text-[20px] font-medium leading-tight text-ink">
          Pick a time
        </p>
        <p className="mt-1 text-[11px] text-muted">
          {state.rateKind === 'video' ? 'Video' : 'Audio'} · {state.rateMinutes} min
          {state.rateNaira !== null && (
            <> · {formatNaira(state.rateNaira)}</>
          )}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 px-4 pb-4">
        {SLOTS.map((label) => (
          <button
            type="button"
            key={label}
            onClick={() => dispatch({ type: 'select_slot', label })}
            className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-left transition-colors hover:bg-paper-line/30"
          >
            <span className="text-[13px] font-semibold text-ink">{label}</span>
            <IconArrowRight size={14} className="text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PayingPanel({ state, dispatch }: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-paper-elev">
      <div className="flex items-center justify-between px-5 pb-2 pt-7">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Confirm payment
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-7">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-paper">
          <IconCheckCircle size={26} />
        </div>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            You&apos;ll be charged
          </p>
          <p className="mt-1 font-display text-[40px] font-medium leading-none text-ink">
            {state.rateNaira !== null ? formatNaira(state.rateNaira) : ''}
          </p>
          <p className="mt-3 max-w-[200px] text-[11px] leading-relaxed text-muted">
            Held in escrow. Auto-refund if your professional doesn&apos;t show.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'pay_complete' })}
          className="mt-4 h-12 w-full rounded-full bg-ink text-[13px] font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          Pay {state.rateNaira !== null ? formatNaira(state.rateNaira) : ''}
        </button>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
          Demo · no real charge
        </p>
      </div>
    </div>
  );
}

export function CallingPanel({ state, dispatch }: PanelProps) {
  const professional = findProfessional(state.proId);
  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="flex items-center justify-between px-5 pb-2 pt-7">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/60">
          In call
        </span>
        <span className="font-mono text-[12px] font-semibold text-paper/80">
          {formatElapsed(state.elapsedSeconds)}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 font-display text-2xl font-medium">
          {(professional?.name ?? 'XX')
            .split(' ')
            .filter((w) => /^[A-Za-z]/.test(w))
            .map((w) => w[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div className="text-center">
          <p className="font-display text-[18px] font-medium leading-tight">
            {professional?.name ?? 'Your professional'}
          </p>
          <p className="mt-1 text-[11px] text-paper/60">
            {professional?.role ?? ''}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Connected
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 pb-9">
        <button
          type="button"
          aria-label="Mute"
          className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20"
        >
          <IconMic size={18} />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'end_call' })}
          aria-label="End call"
          className="grid h-14 w-14 place-items-center rounded-full bg-[#dc2626] text-white shadow-[0_10px_30px_-10px_rgba(220,38,38,0.55)] transition-transform active:scale-95"
        >
          <IconPhoneOff size={22} />
        </button>
        <button
          type="button"
          aria-label="Video"
          className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20"
        >
          <IconVideo size={18} />
        </button>
      </div>
    </div>
  );
}

export function EndedPanel({ state, dispatch }: PanelProps) {
  const professional = findProfessional(state.proId);
  return (
    <div className="flex h-full flex-col bg-paper-elev">
      <div className="flex items-center justify-between px-5 pb-2 pt-7">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Call ended
        </span>
        <span className="font-mono text-[12px] font-semibold text-muted">
          {formatElapsed(state.elapsedSeconds)}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <IconCheckCircle size={26} />
        </div>
        <div>
          <p className="font-display text-[20px] font-medium leading-tight text-ink">
            Talk went well?
          </p>
          <p className="mt-1.5 text-[12px] text-muted">
            Rate {professional?.name ?? 'your professional'} — it stays on
            their profile.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <IconStar
              key={n}
              size={26}
              className="text-highlight"
              fill="currentColor"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'reset' })}
          className="mt-3 h-11 rounded-full bg-ink px-6 text-[13px] font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          Try the demo again
        </button>
      </div>
    </div>
  );
}

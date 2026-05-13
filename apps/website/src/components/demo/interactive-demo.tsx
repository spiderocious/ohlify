'use client';

import { useEffect, useReducer, useState } from 'react';

import { PhoneFrame } from '../marketing/phone-frame';
import {
  CallingPanel,
  DetailsPanel,
  EndedPanel,
  HomePanel,
  PayingPanel,
  SchedulePanel,
} from './demo-panels';
import { demoReducer, INITIAL_STATE, type DemoPhase } from './demo-state';

const PHASE_LABEL: Record<DemoPhase, string> = {
  home: 'Browse',
  details: 'Pick a rate',
  schedule: 'Pick a time',
  paying: 'Confirm payment',
  calling: 'Talk',
  ended: 'Rate',
};

const PHASE_ORDER: readonly DemoPhase[] = [
  'home',
  'details',
  'schedule',
  'paying',
  'calling',
  'ended',
];

/**
 * Client-side interactive demo. No network, no Agora SDK, no real
 * Paystack. Drives a tiny state machine through the booking lifecycle
 * so visitors can feel the entire flow without leaving the page.
 *
 * On lg+ the step list sits to the left of the phone frame; on mobile
 * the phone goes first, the step list second.
 */
export function InteractiveDemo() {
  const [state, dispatch] = useReducer(demoReducer, INITIAL_STATE);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (state.phase !== 'calling') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const renderPanel = () => {
    switch (state.phase) {
      case 'home':
        return <HomePanel state={state} dispatch={dispatch} />;
      case 'details':
        return <DetailsPanel state={state} dispatch={dispatch} />;
      case 'schedule':
        return <SchedulePanel state={state} dispatch={dispatch} />;
      case 'paying':
        return <PayingPanel state={state} dispatch={dispatch} />;
      case 'calling':
        return <CallingPanel state={state} dispatch={dispatch} />;
      case 'ended':
        return <EndedPanel state={state} dispatch={dispatch} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
      <div className="order-2 lg:order-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Step {PHASE_ORDER.indexOf(state.phase) + 1} of {PHASE_ORDER.length}
        </p>
        <ol className="mt-5 border-t border-paper-line">
          {PHASE_ORDER.map((phase, i) => {
            const isActive = phase === state.phase;
            const isPast = PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(state.phase);
            return (
              <li
                key={phase}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-paper-line py-4"
              >
                <span className="font-display text-[14px] font-medium leading-none text-muted">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <span
                  className={`font-display text-[18px] font-medium leading-none ${
                    isActive
                      ? 'text-ink'
                      : isPast
                        ? 'text-ink-soft line-through'
                        : 'text-muted'
                  }`}
                >
                  {PHASE_LABEL[phase]}
                </span>
                {isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                    Now
                  </span>
                )}
                {isPast && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Done
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-6 max-w-md text-[13px] leading-relaxed text-muted">
          Live demo, no real network, no real money, no real call. Tap your
          way through to feel the rhythm.
        </p>
      </div>
      <div
        className="order-1 mx-auto flex justify-center lg:order-2"
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
      >
        <PhoneFrame>
          <div
            key={state.phase}
            className="h-full w-full animate-[fadeIn_220ms_ease-out]"
          >
            {renderPanel()}
          </div>
        </PhoneFrame>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [data-reduced-motion='true'] [class*='animate-[fadeIn'] {
          animation: none;
        }
      `}</style>
    </div>
  );
}

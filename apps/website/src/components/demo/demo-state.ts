/**
 * State machine for the marketing-page interactive demo.
 *
 * Six phases:
 *   home     → user is browsing the professional list
 *   details  → tapped a professional card; sees header + rates
 *   schedule → picked a rate, choosing a time slot
 *   paying   → faux Paystack pay-overlay
 *   calling  → in-call view (no real RTC; fake elapsed counter)
 *   ended    → post-call rating screen
 *
 * The whole thing is in-memory; refresh and you're back at home.
 */
export type DemoPhase = 'home' | 'details' | 'schedule' | 'paying' | 'calling' | 'ended';

export interface DemoState {
  phase: DemoPhase;
  /** Selected professional id when phase >= 'details'. */
  proId: string | null;
  /** Selected rate id when phase >= 'schedule'. */
  rateKind: 'audio' | 'video' | null;
  rateMinutes: number | null;
  rateNaira: number | null;
  /** Selected slot label (e.g. '2:30 PM today') when phase >= 'paying'. */
  slotLabel: string | null;
  /** Seconds since the demo entered 'calling'. Driven by an interval. */
  elapsedSeconds: number;
}

export const INITIAL_STATE: DemoState = {
  phase: 'home',
  proId: null,
  rateKind: null,
  rateMinutes: null,
  rateNaira: null,
  slotLabel: null,
  elapsedSeconds: 0,
};

export type DemoAction =
  | { type: 'select_pro'; proId: string }
  | { type: 'back_to_home' }
  | {
      type: 'select_rate';
      kind: 'audio' | 'video';
      minutes: number;
      naira: number;
    }
  | { type: 'select_slot'; label: string }
  | { type: 'pay_complete' }
  | { type: 'tick' }
  | { type: 'end_call' }
  | { type: 'reset' };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'select_pro':
      return { ...state, phase: 'details', proId: action.proId };
    case 'back_to_home':
      return { ...INITIAL_STATE };
    case 'select_rate':
      return {
        ...state,
        phase: 'schedule',
        rateKind: action.kind,
        rateMinutes: action.minutes,
        rateNaira: action.naira,
      };
    case 'select_slot':
      return { ...state, phase: 'paying', slotLabel: action.label };
    case 'pay_complete':
      return { ...state, phase: 'calling', elapsedSeconds: 0 };
    case 'tick':
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
    case 'end_call':
      return { ...state, phase: 'ended' };
    case 'reset':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export const SLOTS = [
  '2:30 PM today',
  '4:00 PM today',
  '11:00 AM tomorrow',
  '2:00 PM tomorrow',
  '6:30 PM Friday',
] as const;

export const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const formatNaira = (kobo: number): string =>
  `₦${kobo.toLocaleString('en-NG')}`;

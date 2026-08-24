import {
  HawkCaption,
  HawkDot,
  HawkIcon,
  HawkProgressBar,
  HawkSemantic,
  HawkText,
  IconAlertTriangle,
  IconCheck,
  cn,
  quartet,
} from '@ohlify/hawk-ui';

/**
 * The probe shape the tiles render. Mirrors `AdminDependencyProbe` from the
 * API plus a display label, which the server does not send — it returns keys
 * (`db`, `redis`) and the client owns their wording.
 */
export const ServiceState = {
  OK: 'ok',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;
export type ServiceState = (typeof ServiceState)[keyof typeof ServiceState];

export interface DependencyHealth {
  key: string;
  label: string;
  state: ServiceState;
  detail: string;
  hint?: string;
}

const STATE_SEMANTIC: Record<ServiceState, HawkSemantic> = {
  [ServiceState.OK]: HawkSemantic.SUCCESS,
  [ServiceState.DEGRADED]: HawkSemantic.CAUTION,
  [ServiceState.DOWN]: HawkSemantic.CRITICAL,
};

/**
 * A dependency's liveness.
 *
 * The state dot leads and the number qualifies it. "Postgres · 4ms" reads at a
 * glance; "Postgres" with a green tick underneath reads as decoration — an
 * operator cannot tell a healthy database from one answering in 900ms.
 */
export function DependencyTile({ dependency }: { dependency: DependencyHealth }) {
  // Falls back rather than indexing blind: the state arrives off the wire, and
  // an unrecognised value must not crash the board.
  const semantic = STATE_SEMANTIC[dependency.state] ?? HawkSemantic.NEUTRAL;
  const tone = quartet(semantic);

  return (
    <div className="flex items-start gap-hawk-4 rounded-hawk-sm border border-hawk-line p-hawk-5">
      <span className="mt-hawk-1">
        <HawkDot semantic={semantic} pulse={dependency.state !== ServiceState.OK} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="label" ink="strong" className="font-medium">
          {dependency.label}
        </HawkText>
        <HawkText variant="caption" record className={tone.text}>
          {dependency.detail}
        </HawkText>
        {dependency.hint && <HawkCaption ink="disabled">{dependency.hint}</HawkCaption>}
      </div>
    </div>
  );
}

/**
 * A counted technical signal.
 *
 * `tone` is derived from the number rather than passed: zero dead letters is
 * success, any dead letters is a problem, and having the caller decide that
 * each time is how a "0" ends up rendered in red somewhere.
 */
export function CountTile({
  label,
  value,
  hint,
  /** When true, a non-zero value is bad news. Defaults to true. */
  zeroIsGood = true,
  suffix,
}: {
  label: string;
  value: number;
  hint?: string;
  zeroIsGood?: boolean;
  suffix?: string;
}) {
  const bad = zeroIsGood && value > 0;
  const tone = quartet(bad ? HawkSemantic.CAUTION : HawkSemantic.NEUTRAL);

  return (
    <div className="flex flex-col gap-hawk-1">
      <span className="flex items-baseline gap-hawk-2">
        <HawkText variant="medium" record className={cn('font-semibold', bad && tone.text)}>
          {value.toLocaleString()}
        </HawkText>
        {suffix && <HawkCaption ink="muted">{suffix}</HawkCaption>}
      </span>
      <HawkText variant="label">{label}</HawkText>
      {hint && (
        <HawkCaption ink="disabled" className="leading-snug">
          {hint}
        </HawkCaption>
      )}
    </div>
  );
}

/**
 * A pass/fail invariant.
 *
 * Distinct from a count because the failure mode is different: a drifted
 * ledger or a disabled append-only trigger is not "a bit worse", it is broken,
 * and the tile should read that way.
 */
export function GuardTile({
  label,
  intact,
  hint,
}: {
  label: string;
  intact: boolean;
  hint?: string;
}) {
  const tone = quartet(intact ? HawkSemantic.SUCCESS : HawkSemantic.CRITICAL);

  return (
    <div
      className={cn(
        'flex items-start gap-hawk-4 rounded-hawk-sm border px-hawk-5 py-hawk-4',
        tone.softBg,
        tone.border,
      )}
    >
      <HawkIcon
        icon={intact ? IconCheck : IconAlertTriangle}
        size={15}
        className={cn('mt-hawk-1', tone.text)}
      />
      <div className="flex min-w-0 flex-col gap-hawk-1">
        <HawkText variant="label" className={cn('font-medium', tone.onSoft)}>
          {label}
        </HawkText>
        {hint && <HawkCaption ink="muted">{hint}</HawkCaption>}
      </div>
    </div>
  );
}

/**
 * A saturation bar — pool connections, heap, delivery rate.
 *
 * Escalates its own tone past 70% and 90%. A utilisation bar that stays the
 * same colour at 95% is a bar nobody looks at.
 */
export function SaturationBar({
  label,
  value,
  max,
  format,
}: {
  label: string;
  value: number;
  max: number;
  format?: (value: number, max: number) => string;
}) {
  const ratio = max === 0 ? 0 : value / max;
  const semantic =
    ratio >= 0.9
      ? HawkSemantic.CRITICAL
      : ratio >= 0.7
        ? HawkSemantic.CAUTION
        : HawkSemantic.SUCCESS;

  return (
    <div className="flex flex-col gap-hawk-2">
      <div className="flex items-baseline justify-between gap-hawk-4">
        <HawkText variant="label">{label}</HawkText>
        <HawkCaption ink="muted" className="hawk-record">
          {format ? format(value, max) : `${value} / ${max}`}
        </HawkCaption>
      </div>
      <HawkProgressBar value={Math.min(1, ratio)} height={6} semantic={semantic} />
    </div>
  );
}

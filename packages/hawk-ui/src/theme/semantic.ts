/**
 * The semantic enum — one vocabulary, five values. CONTRACTS §1.
 *
 * Used verbatim by badge, tag, status indicator, callout, banner, toast,
 * progress, form validation, sentiment rows and chart annotations. If a
 * component needs a tone it takes one of these five. **No component invents a
 * sixth.**
 *
 * Declared as a POJO-plus-union rather than a TS `enum`: it is the codebase's
 * established idiom (see `StatusTone` in admin-web), it survives `erasableSyntax`
 * rules, and the values are the literal strings that appear in class names.
 */
export const HawkSemantic = {
  NEUTRAL: 'neutral',
  INFO: 'info',
  SUCCESS: 'success',
  CAUTION: 'caution',
  CRITICAL: 'critical',
} as const;
export type HawkSemantic = (typeof HawkSemantic)[keyof typeof HawkSemantic];

export const HAWK_SEMANTICS: readonly HawkSemantic[] = [
  HawkSemantic.NEUTRAL,
  HawkSemantic.INFO,
  HawkSemantic.SUCCESS,
  HawkSemantic.CAUTION,
  HawkSemantic.CRITICAL,
];

/**
 * The mandatory quartet. CONTRACTS §1.1.
 *
 * | slot | job |
 * |---|---|
 * | `base` | the saturated colour — icons, borders on solid fills, text on paper |
 * | `soft` | the tint — badge/banner/callout backgrounds |
 * | `onSoft` | text/icon **on** `soft`. Never `base` — contrast fails at small sizes. |
 * | `border` | the hairline for outlined variants |
 *
 * A component asks for a slot; it never mixes its own. The absence of this
 * quartet is why the pre-Hawk audit found 26 files hand-mixing 13 tints —
 * three different greens doing one job.
 */
export interface HawkQuartet {
  /** Tailwind text-colour class for `base`. */
  readonly text: string;
  /** Tailwind background class for `soft`. */
  readonly softBg: string;
  /** Tailwind text-colour class for `onSoft`. */
  readonly onSoft: string;
  /** Tailwind border-colour class for `border`. */
  readonly border: string;
  /** Tailwind background class for `base` — solid fills. */
  readonly solidBg: string;
  /** The CSS variable for `base`, for the rare inline case (charts, meters). */
  readonly cssBase: string;
  readonly cssSoft: string;
  readonly cssOnSoft: string;
  readonly cssBorder: string;
}

/**
 * Every quartet, keyed by semantic. Written out in full rather than generated
 * from a template so Tailwind's scanner sees each literal class name — a
 * generated `` `bg-hawk-${s}-soft` `` would be purged from the build.
 */
export const HAWK_QUARTET: Record<HawkSemantic, HawkQuartet> = {
  neutral: {
    text: 'text-hawk-neutral',
    softBg: 'bg-hawk-neutral-soft',
    onSoft: 'text-hawk-neutral-on-soft',
    border: 'border-hawk-neutral-border',
    solidBg: 'bg-hawk-neutral',
    cssBase: 'var(--hawk-sem-neutral)',
    cssSoft: 'var(--hawk-sem-neutral-soft)',
    cssOnSoft: 'var(--hawk-sem-neutral-on-soft)',
    cssBorder: 'var(--hawk-sem-neutral-border)',
  },
  info: {
    text: 'text-hawk-info',
    softBg: 'bg-hawk-info-soft',
    onSoft: 'text-hawk-info-on-soft',
    border: 'border-hawk-info-border',
    solidBg: 'bg-hawk-info',
    cssBase: 'var(--hawk-sem-info)',
    cssSoft: 'var(--hawk-sem-info-soft)',
    cssOnSoft: 'var(--hawk-sem-info-on-soft)',
    cssBorder: 'var(--hawk-sem-info-border)',
  },
  success: {
    text: 'text-hawk-success',
    softBg: 'bg-hawk-success-soft',
    onSoft: 'text-hawk-success-on-soft',
    border: 'border-hawk-success-border',
    solidBg: 'bg-hawk-success',
    cssBase: 'var(--hawk-sem-success)',
    cssSoft: 'var(--hawk-sem-success-soft)',
    cssOnSoft: 'var(--hawk-sem-success-on-soft)',
    cssBorder: 'var(--hawk-sem-success-border)',
  },
  caution: {
    text: 'text-hawk-caution',
    softBg: 'bg-hawk-caution-soft',
    onSoft: 'text-hawk-caution-on-soft',
    border: 'border-hawk-caution-border',
    solidBg: 'bg-hawk-caution',
    cssBase: 'var(--hawk-sem-caution)',
    cssSoft: 'var(--hawk-sem-caution-soft)',
    cssOnSoft: 'var(--hawk-sem-caution-on-soft)',
    cssBorder: 'var(--hawk-sem-caution-border)',
  },
  critical: {
    text: 'text-hawk-critical',
    softBg: 'bg-hawk-critical-soft',
    onSoft: 'text-hawk-critical-on-soft',
    border: 'border-hawk-critical-border',
    solidBg: 'bg-hawk-critical',
    cssBase: 'var(--hawk-sem-critical)',
    cssSoft: 'var(--hawk-sem-critical-soft)',
    cssOnSoft: 'var(--hawk-sem-critical-on-soft)',
    cssBorder: 'var(--hawk-sem-critical-border)',
  },
};

export function quartet(semantic: HawkSemantic): HawkQuartet {
  return HAWK_QUARTET[semantic];
}

/**
 * Hazard — the system alarm-state. CONTRACTS §0.2.
 *
 * Deliberately **not** a sixth semantic, and deliberately not reachable from
 * `HawkSemantic`. Hazard escalates within the warm family (`caution` →
 * `hazard`) and is something the system *reports*; a user can never press one.
 * Critical red stays reserved for irreversible operator actions.
 */
export const HAWK_HAZARD: HawkQuartet = {
  text: 'text-hawk-hazard',
  softBg: 'bg-hawk-hazard-soft',
  onSoft: 'text-hawk-hazard-on-soft',
  border: 'border-hawk-hazard-border',
  solidBg: 'bg-hawk-hazard',
  cssBase: 'var(--hawk-hazard)',
  cssSoft: 'var(--hawk-hazard-soft)',
  cssOnSoft: 'var(--hawk-hazard-on-soft)',
  cssBorder: 'var(--hawk-hazard-border)',
};

/**
 * Danger — irreversible, user-initiated operator actions. Colder than hazard,
 * and the only place critical red is a pressable surface.
 */
export const HAWK_DANGER: HawkQuartet = {
  text: 'text-hawk-danger',
  softBg: 'bg-hawk-danger-soft',
  onSoft: 'text-hawk-danger-on-soft',
  border: 'border-hawk-danger-border',
  solidBg: 'bg-hawk-danger',
  cssBase: 'var(--hawk-danger)',
  cssSoft: 'var(--hawk-danger-soft)',
  cssOnSoft: 'var(--hawk-danger-on-soft)',
  cssBorder: 'var(--hawk-danger-border)',
};

/**
 * Money direction, strictly by sign — banker's-ledger discipline, not
 * decoration. Debits render as ink rather than red: red means *failed*, and a
 * successful debit is not a failure.
 */
export const HawkMoneyDirection = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  REVERSAL: 'reversal',
} as const;
export type HawkMoneyDirection =
  (typeof HawkMoneyDirection)[keyof typeof HawkMoneyDirection];

export const HAWK_MONEY_INK: Record<HawkMoneyDirection, string> = {
  credit: 'text-hawk-credit',
  debit: 'text-hawk-debit',
  reversal: 'text-hawk-reversal',
};

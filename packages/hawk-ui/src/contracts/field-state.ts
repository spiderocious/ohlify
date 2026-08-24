/**
 * The disabled / readOnly / error triad. CONTRACTS §2.
 *
 * Three **independent booleans** on every input-family component. Never one
 * collapsed `state` enum.
 *
 * | flag | meaning |
 * |---|---|
 * | `disabled` | cannot interact; visually muted; the value may not matter |
 * | `readOnly` | **legible and real, but locked right now** — full ink retained |
 * | `error`    | interactive and editable, but currently invalid |
 *
 * They combine. `readOnly + error` is the normal state of a KYC field under
 * review that failed a prior check: visible, legible, not editable, flagged.
 *
 * The pre-Hawk app had `disabled` and `errorMessage` but **no `readOnly`**, so
 * locked-but-readable data was faked with `disabled` — muting information the
 * user needs to read. That is the bug this contract exists to prevent.
 */
export interface HawkFieldState {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly error?: boolean;
  /** Shown beneath the field when `error` is displayed. */
  readonly errorText?: string;
}

export const HAWK_FIELD_ENABLED: HawkFieldState = {};

/** Whether the control rejects interaction — disabled *or* read-only. */
export function isInert(state: HawkFieldState): boolean {
  return Boolean(state.disabled) || Boolean(state.readOnly);
}

/**
 * Whether content should be visually muted.
 *
 * **Only `disabled` dims.** This single line is the whole point of the triad:
 * a read-only field keeps full ink contrast, because it is real data the user
 * is meant to read. Dimming it would destroy the distinction.
 */
export function dimsContent(state: HawkFieldState): boolean {
  return Boolean(state.disabled);
}

/**
 * Whether the error treatment is shown.
 *
 * A disabled field does not shout. If the control cannot be interacted with at
 * all, an error ring on it is noise the user can do nothing about — so
 * `disabled` suppresses the display while leaving the flag itself intact for
 * whatever re-enables the field later.
 */
export function showsError(state: HawkFieldState): boolean {
  return Boolean(state.error) && !state.disabled;
}

/** The error text, if it should currently be displayed. */
export function errorTextOf(state: HawkFieldState): string | undefined {
  return showsError(state) ? state.errorText : undefined;
}

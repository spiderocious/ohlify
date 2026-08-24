import { useId, type ReactNode } from 'react';

import {
  dimsContent,
  errorTextOf,
  isInert,
  showsError,
  type HawkFieldState,
} from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconLock } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * The field wrapper — label, hint, error, and the triad's visual rules.
 *
 * Every input-family component wraps in this, which is what makes CONTRACTS §2
 * a system property rather than 19 separate implementations that mostly agree.
 *
 * The three rules it enforces:
 *
 * - **Only `disabled` dims.** A read-only field keeps full ink, because it is
 *   real data the user is meant to read.
 * - **`readOnly` is announced, not just styled.** The lock glyph and
 *   `aria-readonly` say the same thing to the eye and to a screen reader.
 * - **`disabled` suppresses the error display** while keeping the flag. An
 *   error ring on a control nobody can touch is noise the user cannot act on.
 */
export interface HawkFieldProps {
  children: ReactNode;
  label?: string;
  /** Helper text below the control, shown when there is no error. */
  hint?: ReactNode;
  state?: HawkFieldState;
  /** Marks the field as required in the label. */
  required?: boolean;
  /** Right-aligned label adornment — a character counter, "Optional". */
  labelAdornment?: ReactNode;
  className?: string;
  /** The id of the control, so the label's `htmlFor` points at it. */
  htmlFor?: string;
}

export function HawkField({
  children,
  label,
  hint,
  state = {},
  required = false,
  labelAdornment,
  className,
  htmlFor,
}: HawkFieldProps) {
  const error = errorTextOf(state);

  return (
    <div className={cn('flex w-full flex-col gap-hawk-3', className)}>
      {(label || labelAdornment) && (
        <div className="flex items-baseline justify-between gap-hawk-4">
          {label && (
            <label
              htmlFor={htmlFor}
              className={cn(
                'inline-flex items-center gap-hawk-2 text-hawk-label font-medium',
                // Note the ladder: a read-only label stays fully legible.
                dimsContent(state) ? 'text-hawk-ink-disabled' : 'text-hawk-ink',
              )}
            >
              {label}
              {required && (
                <span aria-hidden="true" className="text-hawk-critical">
                  *
                </span>
              )}
              {state.readOnly && (
                <HawkIcon
                  icon={IconLock}
                  size={12}
                  label="Read-only"
                  className="text-hawk-ink-muted"
                />
              )}
            </label>
          )}
          {labelAdornment}
        </div>
      )}

      {children}

      {error ? (
        <span className="flex items-center gap-hawk-2 text-hawk-caption text-hawk-critical">
          <HawkIcon icon={IconAlertTriangle} size={12} />
          <span>{error}</span>
        </span>
      ) : (
        hint && (
          <HawkText variant="caption" ink={dimsContent(state) ? 'disabled' : 'muted'}>
            {hint}
          </HawkText>
        )
      )}
    </div>
  );
}

/**
 * The bordered box every text-like control sits in.
 *
 * Separated from `HawkField` because the box is what a control *is*, while the
 * field is what surrounds it — a checkbox group has a field but no box, and a
 * dropdown trigger has a box that is not an `<input>` at all.
 */
export interface HawkFieldBoxProps {
  children: ReactNode;
  state?: HawkFieldState;
  focused?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Grow with content — the textarea case. */
  auto?: boolean;
  className?: string;
  onClick?: () => void;
}

export function HawkFieldBox({
  children,
  state = {},
  focused = false,
  leading,
  trailing,
  auto = false,
  className,
  onClick,
}: HawkFieldBoxProps) {
  const invalid = showsError(state);

  return (
    <div
      onClick={onClick}
      className={cn(
        'hawk-motion flex items-center gap-hawk-4 rounded-hawk-sm border bg-hawk-paper',
        'px-hawk-5 transition-colors duration-hawk-fast ease-hawk-standard',
        auto ? 'min-h-hawk-md py-hawk-4' : 'h-hawk-md',
        invalid
          ? 'border-hawk-critical'
          : focused
            ? 'border-hawk-acc shadow-hawk-focus'
            : 'border-hawk-line',
        // Read-only gets the stock tint rather than the disabled dim: it reads
        // as "locked" without reading as "irrelevant".
        state.readOnly && !state.disabled && 'bg-hawk-stock',
        state.disabled && 'bg-hawk-sunken opacity-[var(--hawk-state-disabled-opacity)]',
        isInert(state) && 'cursor-not-allowed',
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing}
    </div>
  );
}

/** Shared class for the bare `<input>` inside a `HawkFieldBox`. */
export const HAWK_INPUT_CLASS = cn(
  'w-full min-w-0 border-none bg-transparent p-0 text-hawk-body text-hawk-ink outline-none',
  'placeholder:text-hawk-ink-disabled disabled:cursor-not-allowed',
);

/** Generates a stable id pair for a control and its error message. */
export function useFieldIds(provided?: string): { id: string; errorId: string } {
  const generated = useId();
  const id = provided ?? generated;
  return { id, errorId: `${id}-error` };
}

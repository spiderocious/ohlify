import { useRef, useState, type ReactNode } from 'react';

import { isInert, showsError, type HawkFieldState } from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { IconClose } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HawkField } from './field.js';

export interface HawkCodeInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  /** Render dots instead of digits — the passcode variant. */
  masked?: boolean;
  className?: string;
}

/**
 * The OTP / passcode input.
 *
 * One `<input>` per cell, because the alternative — a single field styled to
 * look like cells — breaks the platform's own SMS autofill, which is the single
 * most valuable affordance an OTP field has.
 *
 * `masked` here is the *passcode* treatment and is a genuine prop, unlike money
 * masking (CONTRACTS §9) which is ambient. A passcode is always hidden; a
 * balance is hidden by preference.
 */
export function HawkCodeInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  label,
  hint,
  state = {},
  masked = false,
  className,
}: HawkCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inert = isInert(state);
  const invalid = showsError(state);

  const setAt = (index: number, char: string) => {
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = char;
    const next = chars.join('').trimEnd();
    onChange?.(next);
    if (next.replace(/\s/g, '').length === length) onComplete?.(next);
  };

  return (
    <HawkField label={label} hint={hint} state={state} className={className}>
      <div className="flex gap-hawk-4">
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? '';
          return (
            <input
              key={index}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type={masked ? 'password' : 'text'}
              inputMode="numeric"
              // `one-time-code` is what triggers iOS/Android SMS autofill.
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={char}
              disabled={state.disabled}
              readOnly={state.readOnly}
              aria-label={`Digit ${index + 1}`}
              aria-invalid={invalid || undefined}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, '').slice(-1);
                if (!digit) return;
                setAt(index, digit);
                refs.current[index + 1]?.focus();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace') {
                  event.preventDefault();
                  if (char) {
                    setAt(index, '');
                  } else {
                    // Empty cell: step back and clear the previous one, which
                    // is what a user pressing backspace repeatedly expects.
                    refs.current[index - 1]?.focus();
                    setAt(index - 1, '');
                  }
                }
                if (event.key === 'ArrowLeft') refs.current[index - 1]?.focus();
                if (event.key === 'ArrowRight') refs.current[index + 1]?.focus();
              }}
              onPaste={(event) => {
                // A pasted code fills the whole row, not just the cell under
                // the cursor — pasting from an SMS is the common path.
                event.preventDefault();
                const pasted = event.clipboardData
                  .getData('text')
                  .replace(/\D/g, '')
                  .slice(0, length);
                if (!pasted) return;
                onChange?.(pasted);
                if (pasted.length === length) onComplete?.(pasted);
                refs.current[Math.min(pasted.length, length - 1)]?.focus();
              }}
              className={cn(
                'hawk-motion h-14 w-full min-w-0 rounded-hawk-sm border bg-hawk-paper text-center',
                'hawk-record text-hawk-body-title font-bold tabular-nums text-hawk-ink-strong',
                'outline-none transition-colors duration-hawk-fast',
                invalid
                  ? 'border-hawk-critical'
                  : focusedIndex === index
                    ? 'border-hawk-acc shadow-hawk-focus'
                    : 'border-hawk-line',
                state.readOnly && !state.disabled && 'bg-hawk-stock',
                state.disabled && 'bg-hawk-sunken opacity-[var(--hawk-state-disabled-opacity)]',
                inert && 'cursor-not-allowed',
              )}
            />
          );
        })}
      </div>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkKeypadProps {
  onDigit?: (digit: string) => void;
  onBackspace?: () => void;
  /** The bottom-left slot — biometric unlock, or nothing. */
  biometricIcon?: HawkIconComponent;
  onBiometric?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The numeric keypad.
 *
 * Used on the app-lock screen in place of the platform keyboard: it is faster
 * for digits, and a full keyboard on a passcode screen is a shoulder-surfing
 * surface the keypad avoids.
 */
export function HawkKeypad({
  onDigit,
  onBackspace,
  biometricIcon,
  onBiometric,
  disabled = false,
  className,
}: HawkKeypadProps) {
  const key = (content: ReactNode, onPress?: () => void, label?: string) => (
    <button
      type="button"
      disabled={disabled || !onPress}
      onClick={onPress}
      aria-label={label}
      className={cn(
        'hawk-focusable hawk-motion flex h-16 items-center justify-center rounded-hawk-sm',
        'hawk-record text-hawk-title font-semibold tabular-nums text-hawk-ink-strong',
        'transition-colors duration-hawk-instant hover:bg-hawk-hovered active:bg-hawk-pressed',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {content}
    </button>
  );

  return (
    <div className={cn('grid w-full max-w-xs grid-cols-3 gap-hawk-3', className)}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <div key={digit}>{key(digit, () => onDigit?.(digit), digit)}</div>
      ))}
      <div>
        {biometricIcon
          ? key(<HawkIcon icon={biometricIcon} size={22} />, onBiometric, 'Unlock with biometrics')
          : key('', undefined)}
      </div>
      <div>{key('0', () => onDigit?.('0'), '0')}</div>
      <div>{key(<HawkIcon icon={IconClose} size={20} />, onBackspace, 'Delete')}</div>
    </div>
  );
}

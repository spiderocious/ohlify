import { useState, type ReactNode } from 'react';

import { isInert, showsError, type HawkFieldState } from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { NAIRA, formatKobo, toKobo } from '../foundation/money.js';
import { HawkText } from '../foundation/text.js';
import { IconEye, IconEyeOff, IconSearch, IconClose, IconCheck } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HAWK_INPUT_CLASS, HawkField, HawkFieldBox, useFieldIds } from './field.js';

export interface HawkTextInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  leadingIcon?: HawkIconComponent;
  trailing?: ReactNode;
  required?: boolean;
  maxLength?: number;
  /** Show a live character counter beside the label. */
  showCount?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
  autoComplete?: string;
  id?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function HawkTextInput({
  value,
  onChange,
  label,
  placeholder,
  hint,
  state = {},
  leadingIcon,
  trailing,
  required = false,
  maxLength,
  showCount = false,
  type = 'text',
  autoComplete,
  id: providedId,
  className,
  onFocus,
  onBlur,
}: HawkTextInputProps) {
  const [focused, setFocused] = useState(false);
  const { id, errorId } = useFieldIds(providedId);

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      required={required}
      htmlFor={id}
      className={className}
      labelAdornment={
        showCount && maxLength !== undefined ? (
          <HawkText variant="caption" ink="muted" record>
            {(value ?? '').length}/{maxLength}
          </HawkText>
        ) : undefined
      }
    >
      <HawkFieldBox
        state={state}
        focused={focused}
        leading={
          leadingIcon && (
            <HawkIcon icon={leadingIcon} size={16} className="text-hawk-ink-muted" />
          )
        }
        trailing={trailing}
      >
        <input
          id={id}
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={state.disabled}
          readOnly={state.readOnly}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={showsError(state) || undefined}
          aria-errormessage={showsError(state) ? errorId : undefined}
          aria-readonly={state.readOnly || undefined}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onChange={(event) => onChange?.(event.target.value)}
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkCurrencyInputProps {
  /** Value in kobo. */
  value?: number;
  onChange?: (kobo: number) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  placeholder?: string;
  /** Preset amounts offered beneath the field. */
  presets?: readonly number[];
  /** The most that may be entered, in kobo. */
  maxKobo?: number;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * The currency input.
 *
 * Takes and emits **kobo**, never naira, and never a float. The user types
 * whole naira; the component converts on every keystroke, so the caller never
 * sees a display string and never has to parse one back. That conversion living
 * here rather than at nineteen call sites is the whole point.
 */
export function HawkCurrencyInput({
  value,
  onChange,
  label,
  hint,
  state = {},
  placeholder = '0',
  presets,
  maxKobo,
  required = false,
  id: providedId,
  className,
}: HawkCurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const { id, errorId } = useFieldIds(providedId);

  const naira = value === undefined ? '' : String(Math.floor(value / 100));

  const handle = (raw: string) => {
    // Digits only. A currency field that accepts "12.5.3" and silently coerces
    // it is a field that will one day post a wrong journal.
    const digits = raw.replace(/\D/g, '');
    const kobo = digits === '' ? 0 : Number.parseInt(digits, 10) * 100;
    onChange?.(maxKobo !== undefined ? Math.min(kobo, maxKobo) : kobo);
  };

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      required={required}
      htmlFor={id}
      className={className}
    >
      <HawkFieldBox
        state={state}
        focused={focused}
        leading={<span className="hawk-record text-hawk-body-title text-hawk-ink-muted">{NAIRA}</span>}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={naira}
          placeholder={placeholder}
          disabled={state.disabled}
          readOnly={state.readOnly}
          aria-invalid={showsError(state) || undefined}
          aria-errormessage={showsError(state) ? errorId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => handle(event.target.value)}
          className={cn(HAWK_INPUT_CLASS, 'hawk-record text-hawk-body-title font-bold')}
        />
      </HawkFieldBox>

      {presets && presets.length > 0 && (
        <div className="mt-hawk-3 flex flex-wrap gap-hawk-3">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isInert(state)}
              onClick={() => onChange?.(preset)}
              className={cn(
                'hawk-focusable rounded-hawk-pill border border-hawk-line bg-hawk-paper',
                'px-hawk-5 py-hawk-3 text-hawk-caption font-semibold text-hawk-ink-muted',
                'transition-colors duration-hawk-fast hover:border-hawk-acc-border hover:text-hawk-acc',
                value === preset && 'border-hawk-acc bg-hawk-acc-soft text-hawk-acc-on-soft',
                isInert(state) && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
              )}
            >
              {formatKobo(preset)}
            </button>
          ))}
        </div>
      )}
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkPhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  /** Dial code shown in the leading slot. Defaults to Nigeria. */
  dialCode?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

/** Phone input with a fixed dial-code prefix. */
export function HawkPhoneInput({
  value,
  onChange,
  label,
  hint,
  state = {},
  dialCode = '+234',
  required = false,
  id: providedId,
  className,
}: HawkPhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const { id, errorId } = useFieldIds(providedId);

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      required={required}
      htmlFor={id}
      className={className}
    >
      <HawkFieldBox
        state={state}
        focused={focused}
        leading={
          <span className="flex items-center gap-hawk-4 border-r border-hawk-line pr-hawk-4 text-hawk-body text-hawk-ink-muted">
            {dialCode}
          </span>
        }
      >
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={value ?? ''}
          placeholder="801 234 5678"
          disabled={state.disabled}
          readOnly={state.readOnly}
          aria-invalid={showsError(state) || undefined}
          aria-errormessage={showsError(state) ? errorId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(event.target.value.replace(/[^\d\s]/g, ''))}
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkPasswordInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  placeholder?: string;
  /** Render the strength meter beneath. */
  showStrength?: boolean;
  required?: boolean;
  autoComplete?: string;
  id?: string;
  className?: string;
}

export function HawkPasswordInput({
  value,
  onChange,
  label,
  hint,
  state = {},
  placeholder = '••••••••',
  showStrength = false,
  required = false,
  autoComplete = 'current-password',
  id: providedId,
  className,
}: HawkPasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { id, errorId } = useFieldIds(providedId);

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      required={required}
      htmlFor={id}
      className={className}
    >
      <HawkFieldBox
        state={state}
        focused={focused}
        trailing={
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            disabled={state.disabled}
            className="hawk-focusable rounded-hawk-xs p-1 text-hawk-ink-muted hover:text-hawk-ink"
          >
            <HawkIcon icon={revealed ? IconEyeOff : IconEye} size={16} />
          </button>
        }
      >
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={state.disabled}
          readOnly={state.readOnly}
          autoComplete={autoComplete}
          aria-invalid={showsError(state) || undefined}
          aria-errormessage={showsError(state) ? errorId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(event.target.value)}
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>

      {showStrength && <HawkPasswordStrength value={value ?? ''} />}
    </HawkField>
  );
}

/**
 * Password strength.
 *
 * Deliberately coarse — four steps, and it never blocks submission. A meter
 * that refuses a passphrase because it lacks a digit trains users to pick
 * `Password1!` over something actually strong.
 */
export function HawkPasswordStrength({ value }: { value: string }) {
  const score = strengthOf(value);
  const LABELS = ['Too short', 'Weak', 'Fair', 'Strong'] as const;
  const TONES = [
    'bg-hawk-line-strong',
    'bg-hawk-critical',
    'bg-hawk-caution',
    'bg-hawk-success',
  ] as const;

  return (
    <div className="mt-hawk-3 flex flex-col gap-hawk-2">
      <div className="flex gap-hawk-2">
        {[0, 1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              'hawk-motion h-1 flex-1 rounded-full transition-colors duration-hawk-fast',
              step <= score && value.length > 0 ? TONES[score] : 'bg-hawk-sunken',
            )}
          />
        ))}
      </div>
      {value.length > 0 && (
        <HawkText variant="caption" ink="muted">
          {LABELS[score]}
        </HawkText>
      )}
    </div>
  );
}

function strengthOf(value: string): 0 | 1 | 2 | 3 {
  if (value.length < 8) return 0;
  let score = 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^\w\s]/.test(value)) score += 1;
  // A long passphrase is strong even without a symbol — length beats theatre.
  if (value.length >= 16) score = 3;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  state?: HawkFieldState;
  onClear?: () => void;
  /** Renders the spinner in place of the glyph. */
  searching?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function HawkSearchInput({
  value,
  onChange,
  placeholder = 'Search',
  state = {},
  onClear,
  searching = false,
  className,
  'aria-label': ariaLabel = 'Search',
}: HawkSearchInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <HawkFieldBox
      state={state}
      focused={focused}
      className={cn('rounded-hawk-pill', className)}
      leading={
        searching ? (
          <span className="hawk-motion inline-block h-4 w-4 animate-hawk-spin rounded-full border-2 border-hawk-ink-muted border-t-transparent" />
        ) : (
          <HawkIcon icon={IconSearch} size={16} className="text-hawk-ink-muted" />
        )
      }
      trailing={
        value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange?.('');
              onClear?.();
            }}
            className="hawk-focusable rounded-full p-0.5 text-hawk-ink-muted hover:text-hawk-ink"
          >
            <HawkIcon icon={IconClose} size={14} />
          </button>
        ) : undefined
      }
    >
      <input
        type="search"
        value={value ?? ''}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={state.disabled}
        readOnly={state.readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(HAWK_INPUT_CLASS, '[&::-webkit-search-cancel-button]:hidden')}
      />
    </HawkFieldBox>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export function HawkTextArea({
  value,
  onChange,
  label,
  hint,
  state = {},
  placeholder,
  rows = 4,
  maxLength,
  showCount = true,
  required = false,
  id: providedId,
  className,
}: HawkTextAreaProps) {
  const [focused, setFocused] = useState(false);
  const { id, errorId } = useFieldIds(providedId);

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      required={required}
      htmlFor={id}
      className={className}
      labelAdornment={
        showCount && maxLength !== undefined ? (
          <HawkText variant="caption" ink="muted" record>
            {(value ?? '').length}/{maxLength}
          </HawkText>
        ) : undefined
      }
    >
      <HawkFieldBox state={state} focused={focused} auto className="items-start">
        <textarea
          id={id}
          rows={rows}
          value={value ?? ''}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={state.disabled}
          readOnly={state.readOnly}
          aria-invalid={showsError(state) || undefined}
          aria-errormessage={showsError(state) ? errorId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(HAWK_INPUT_CLASS, 'resize-y')}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkHandleInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  state?: HawkFieldState;
  /** Availability, once checked. `undefined` means not yet checked. */
  available?: boolean;
  checking?: boolean;
  id?: string;
  className?: string;
}

/**
 * The handle input — `@name`, with live availability.
 *
 * The three-way availability (`undefined` / `true` / `false`) is deliberate: a
 * boolean would force "not yet checked" to render as "taken", which is the
 * worst possible default for a field the user is mid-way through typing.
 */
export function HawkHandleInput({
  value,
  onChange,
  label = 'Handle',
  state = {},
  available,
  checking = false,
  id: providedId,
  className,
}: HawkHandleInputProps) {
  const [focused, setFocused] = useState(false);
  const { id } = useFieldIds(providedId);

  const resolved: HawkFieldState =
    available === false ? { ...state, error: true, errorText: 'That handle is taken' } : state;

  return (
    <HawkField label={label} state={resolved} htmlFor={id} className={className}>
      <HawkFieldBox
        state={resolved}
        focused={focused}
        leading={<span className="text-hawk-body text-hawk-ink-muted">@</span>}
        trailing={
          checking ? (
            <span className="hawk-motion inline-block h-4 w-4 animate-hawk-spin rounded-full border-2 border-hawk-ink-muted border-t-transparent" />
          ) : available === true ? (
            <HawkIcon
              icon={IconCheck}
              size={16}
              label="Available"
              className="text-hawk-success"
            />
          ) : undefined
        }
      >
        <input
          id={id}
          type="text"
          value={value ?? ''}
          placeholder="adaeze"
          disabled={state.disabled}
          readOnly={state.readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Handles are lowercase, alphanumeric plus underscore. Normalising on
          // input beats rejecting on submit.
          onChange={(event) =>
            onChange?.(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
          }
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

/** Re-exported so callers can render kobo consistently beside a currency field. */
export { toKobo };

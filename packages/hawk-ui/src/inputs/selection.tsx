import { useId, type ReactNode } from 'react';

import { isInert, type HawkFieldState } from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconCheck, IconMinus, IconPlus, IconStar } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HawkField } from './field.js';

/**
 * Selection controls.
 *
 * All four render a real `<input>` beneath a styled box rather than faking the
 * control with a `div`. The native element is what gives them keyboard
 * behaviour, form participation and correct screen-reader announcement for
 * free — and it is what makes `readOnly` on a checkbox actually mean something.
 */

export interface HawkCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  state?: HawkFieldState;
  /** Neither checked nor unchecked — a partially-selected group header. */
  indeterminate?: boolean;
  id?: string;
  className?: string;
}

export function HawkCheckbox({
  checked = false,
  onChange,
  label,
  description,
  state = {},
  indeterminate = false,
  id: providedId,
  className,
}: HawkCheckboxProps) {
  const generated = useId();
  const id = providedId ?? generated;
  const inert = isInert(state);

  return (
    <div className={cn('flex items-start gap-hawk-4', className)}>
      <span className="relative inline-flex shrink-0 items-center justify-center pt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={state.disabled}
          // `readOnly` has no *native* effect on a checkbox, so the guard is in
          // the handler — without it a read-only checkbox would still toggle.
          // The attribute is still set: it is what tells React the `checked`
          // prop is deliberately non-editable rather than a missing onChange.
          readOnly={inert}
          onChange={(event) => {
            if (inert) return;
            onChange?.(event.target.checked);
          }}
          aria-readonly={state.readOnly || undefined}
          aria-checked={indeterminate ? 'mixed' : checked}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={cn(
            'hawk-motion flex h-[18px] w-[18px] items-center justify-center rounded-hawk-xs border',
            'transition-colors duration-hawk-fast ease-hawk-standard',
            'peer-focus-visible:shadow-hawk-focus',
            checked || indeterminate
              ? 'border-hawk-acc bg-hawk-acc text-hawk-acc-on'
              : 'border-hawk-line-strong bg-hawk-paper',
            state.error && !state.disabled && 'border-hawk-critical',
            inert ? 'cursor-not-allowed' : 'cursor-pointer',
            state.disabled && 'opacity-[var(--hawk-state-disabled-opacity)]',
          )}
        >
          {indeterminate ? (
            <HawkIcon icon={IconMinus} size={12} strokeWidth={3} />
          ) : checked ? (
            <HawkIcon icon={IconCheck} size={12} strokeWidth={3} />
          ) : null}
        </label>
      </span>

      {(label || description) && (
        <label
          htmlFor={id}
          className={cn('flex min-w-0 flex-col', inert ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label && (
            <HawkText
              variant="body"
              ink={state.disabled ? 'disabled' : 'default'}
            >
              {label}
            </HawkText>
          )}
          {description && (
            <HawkText variant="caption" ink="muted">
              {description}
            </HawkText>
          )}
        </label>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkRadioProps {
  checked?: boolean;
  onChange?: () => void;
  label?: ReactNode;
  description?: ReactNode;
  state?: HawkFieldState;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
}

export function HawkRadio({
  checked = false,
  onChange,
  label,
  description,
  state = {},
  name,
  value,
  id: providedId,
  className,
}: HawkRadioProps) {
  const generated = useId();
  const id = providedId ?? generated;
  const inert = isInert(state);

  return (
    <div className={cn('flex items-start gap-hawk-4', className)}>
      <span className="relative inline-flex shrink-0 items-center justify-center pt-0.5">
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={state.disabled}
          readOnly={inert}
          onChange={() => {
            if (inert) return;
            onChange?.();
          }}
          aria-readonly={state.readOnly || undefined}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={cn(
            'hawk-motion flex h-[18px] w-[18px] items-center justify-center rounded-full border',
            'transition-colors duration-hawk-fast ease-hawk-standard',
            'peer-focus-visible:shadow-hawk-focus',
            checked ? 'border-hawk-acc' : 'border-hawk-line-strong',
            state.error && !state.disabled && 'border-hawk-critical',
            inert ? 'cursor-not-allowed' : 'cursor-pointer',
            state.disabled && 'opacity-[var(--hawk-state-disabled-opacity)]',
          )}
        >
          {checked && <span className="h-2.5 w-2.5 rounded-full bg-hawk-acc" />}
        </label>
      </span>

      {(label || description) && (
        <label
          htmlFor={id}
          className={cn('flex min-w-0 flex-col', inert ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label && (
            <HawkText variant="body" ink={state.disabled ? 'disabled' : 'default'}>
              {label}
            </HawkText>
          )}
          {description && (
            <HawkText variant="caption" ink="muted">
              {description}
            </HawkText>
          )}
        </label>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface HawkRadioGroupProps<T extends string> {
  options: ReadonlyArray<HawkOption<T>>;
  value?: T;
  onChange?: (value: T) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  /** Lay out in a row rather than a column. */
  inline?: boolean;
  required?: boolean;
  className?: string;
}

export function HawkRadioGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
  state = {},
  inline = false,
  required = false,
  className,
}: HawkRadioGroupProps<T>) {
  const name = useId();

  return (
    <HawkField label={label} hint={hint} state={state} required={required} className={className}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn('flex gap-hawk-5', inline ? 'flex-row flex-wrap' : 'flex-col')}
      >
        {options.map((option) => (
          <HawkRadio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            label={option.label}
            description={option.description}
            state={option.disabled ? { ...state, disabled: true } : state}
          />
        ))}
      </div>
    </HawkField>
  );
}

export interface HawkCheckboxGroupProps<T extends string> {
  options: ReadonlyArray<HawkOption<T>>;
  value?: readonly T[];
  onChange?: (value: T[]) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  inline?: boolean;
  required?: boolean;
  className?: string;
}

export function HawkCheckboxGroup<T extends string>({
  options,
  value = [],
  onChange,
  label,
  hint,
  state = {},
  inline = false,
  required = false,
  className,
}: HawkCheckboxGroupProps<T>) {
  const toggle = (option: T) => {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange?.(next);
  };

  return (
    <HawkField label={label} hint={hint} state={state} required={required} className={className}>
      <div
        role="group"
        aria-label={label}
        className={cn('flex gap-hawk-5', inline ? 'flex-row flex-wrap' : 'flex-col')}
      >
        {options.map((option) => (
          <HawkCheckbox
            key={option.value}
            checked={value.includes(option.value)}
            onChange={() => toggle(option.value)}
            label={option.label}
            description={option.description}
            state={option.disabled ? { ...state, disabled: true } : state}
          />
        ))}
      </div>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  state?: HawkFieldState;
  /** Label sits left, switch right — the settings-row shape. */
  reversed?: boolean;
  id?: string;
  className?: string;
}

/**
 * The switch.
 *
 * A `role="switch"` button rather than a checkbox: a switch takes effect
 * immediately, and announcing it as a checkbox implies a form the user must
 * still submit.
 */
export function HawkSwitch({
  checked = false,
  onChange,
  label,
  description,
  state = {},
  reversed = false,
  id: providedId,
  className,
}: HawkSwitchProps) {
  const generated = useId();
  const id = providedId ?? generated;
  const inert = isInert(state);

  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-readonly={state.readOnly || undefined}
      disabled={state.disabled}
      onClick={inert ? undefined : () => onChange?.(!checked)}
      className={cn(
        'hawk-focusable hawk-motion relative inline-flex h-6 w-11 shrink-0 items-center',
        'rounded-full transition-colors duration-hawk-fast ease-hawk-standard',
        checked ? 'bg-hawk-acc' : 'bg-hawk-line-strong',
        inert && 'cursor-not-allowed',
        state.disabled && 'opacity-[var(--hawk-state-disabled-opacity)]',
      )}
    >
      <span
        className={cn(
          'hawk-motion inline-block h-5 w-5 rounded-full bg-hawk-paper shadow-sm',
          'transition-transform duration-hawk-fast ease-hawk-standard',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );

  if (!label && !description) return <span className={className}>{control}</span>;

  return (
    <div
      className={cn(
        'flex items-center gap-hawk-5',
        reversed && 'justify-between',
        className,
      )}
    >
      {reversed && (
        <label htmlFor={id} className="flex min-w-0 flex-col">
          <HawkText variant="body" ink={state.disabled ? 'disabled' : 'default'}>
            {label}
          </HawkText>
          {description && (
            <HawkText variant="caption" ink="muted">
              {description}
            </HawkText>
          )}
        </label>
      )}
      {control}
      {!reversed && (
        <label htmlFor={id} className="flex min-w-0 flex-col">
          <HawkText variant="body" ink={state.disabled ? 'disabled' : 'default'}>
            {label}
          </HawkText>
          {description && (
            <HawkText variant="caption" ink="muted">
              {description}
            </HawkText>
          )}
        </label>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkStepperProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  /** Unit suffix — "min", "days". */
  suffix?: string;
  className?: string;
}

export function HawkStepper({
  value = 0,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  hint,
  state = {},
  suffix,
  className,
}: HawkStepperProps) {
  const inert = isInert(state);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <HawkField label={label} hint={hint} state={state} className={className}>
      <div
        className={cn(
          'inline-flex h-hawk-md items-center rounded-hawk-sm border border-hawk-line bg-hawk-paper',
          state.disabled && 'bg-hawk-sunken opacity-[var(--hawk-state-disabled-opacity)]',
          state.readOnly && !state.disabled && 'bg-hawk-stock',
        )}
      >
        <button
          type="button"
          aria-label="Decrease"
          disabled={inert || value <= min}
          onClick={() => onChange?.(clamp(value - step))}
          className="hawk-focusable flex h-full w-10 items-center justify-center rounded-l-hawk-sm text-hawk-ink-muted hover:text-hawk-ink disabled:opacity-40"
        >
          <HawkIcon icon={IconMinus} size={15} />
        </button>

        <span
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          className="hawk-record min-w-[3.5rem] px-hawk-3 text-center text-hawk-body font-semibold tabular-nums text-hawk-ink-strong"
        >
          {value}
          {suffix && <span className="ml-1 text-hawk-caption text-hawk-ink-muted">{suffix}</span>}
        </span>

        <button
          type="button"
          aria-label="Increase"
          disabled={inert || value >= max}
          onClick={() => onChange?.(clamp(value + step))}
          className="hawk-focusable flex h-full w-10 items-center justify-center rounded-r-hawk-sm text-hawk-ink-muted hover:text-hawk-ink disabled:opacity-40"
        >
          <HawkIcon icon={IconPlus} size={15} />
        </button>
      </div>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  /** Display only — no interaction, no hit targets. */
  readOnly?: boolean;
  size?: number;
  /** Show the numeric value beside the stars. */
  showValue?: boolean;
  /** Total ratings, shown as "(128)". */
  count?: number;
  className?: string;
}

export function HawkRating({
  value = 0,
  onChange,
  max = 5,
  readOnly = false,
  size = 16,
  showValue = false,
  count,
  className,
}: HawkRatingProps) {
  const interactive = !readOnly && Boolean(onChange);

  return (
    <span
      className={cn('inline-flex items-center gap-hawk-2', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : `${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const index = i + 1;
        const filled = index <= Math.round(value);
        const star = (
          <HawkIcon
            icon={IconStar}
            size={size}
            className={cn(
              filled ? 'fill-hawk-caution text-hawk-caution' : 'text-hawk-line-strong',
            )}
          />
        );

        return interactive ? (
          <button
            key={index}
            type="button"
            aria-label={`${index} star${index === 1 ? '' : 's'}`}
            aria-pressed={filled}
            onClick={() => onChange?.(index)}
            className="hawk-focusable rounded-hawk-xs transition-transform hover:scale-110"
          >
            {star}
          </button>
        ) : (
          <span key={index}>{star}</span>
        );
      })}

      {showValue && (
        <span className="hawk-record ml-1 text-hawk-label font-semibold tabular-nums text-hawk-ink-strong">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-hawk-caption text-hawk-ink-muted">({count})</span>
      )}
    </span>
  );
}

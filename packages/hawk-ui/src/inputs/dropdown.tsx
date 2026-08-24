import { useEffect, useRef, useState, type ReactNode } from 'react';

import { HawkDataState } from '../contracts/data-state.js';
import { isInert, showsError, type HawkFieldState } from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconCheck, IconChevronDown, IconClose, IconSearch } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HAWK_INPUT_CLASS, HawkField, HawkFieldBox, useFieldIds } from './field.js';

export interface HawkSelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface MenuProps<T extends string> {
  options: ReadonlyArray<HawkSelectOption<T>>;
  selected: readonly T[];
  onPick: (value: T) => void;
  dataState: HawkDataState;
  emptyMessage: string;
  errorMessage?: string;
  onRetry?: () => void;
  activeIndex: number;
}

/**
 * The floating option list.
 *
 * Carries its own four data states (CONTRACTS §10). A dropdown backed by a
 * network list can be loading, empty or in error, and each needs to say so
 * *inside the menu* — an empty box tells the user nothing about whether to wait,
 * retry, or give up.
 */
function Menu<T extends string>({
  options,
  selected,
  onPick,
  dataState,
  emptyMessage,
  errorMessage,
  onRetry,
  activeIndex,
}: MenuProps<T>) {
  if (dataState === HawkDataState.LOADING) {
    return (
      <div className="flex flex-col gap-hawk-5 p-hawk-5">
        <HawkSkeletonLine widthFactor={0.7} />
        <HawkSkeletonLine widthFactor={0.5} />
        <HawkSkeletonLine widthFactor={0.6} />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center gap-hawk-4 p-hawk-6 text-center">
        <HawkText variant="caption" ink="muted">
          {errorMessage}
        </HawkText>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-acc hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (dataState === HawkDataState.EMPTY || options.length === 0) {
    return (
      <div className="p-hawk-6 text-center">
        <HawkText variant="caption" ink="muted">
          {emptyMessage}
        </HawkText>
      </div>
    );
  }

  return (
    <ul role="listbox" className="max-h-72 overflow-y-auto py-hawk-3">
      {options.map((option, index) => {
        const isSelected = selected.includes(option.value);
        return (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={option.disabled}
              onClick={() => onPick(option.value)}
              className={cn(
                'flex w-full items-center gap-hawk-4 px-hawk-5 py-hawk-4 text-left',
                'transition-colors duration-hawk-fast',
                index === activeIndex && 'bg-hawk-hovered',
                isSelected && 'bg-hawk-acc-soft',
                option.disabled
                  ? 'cursor-not-allowed opacity-[var(--hawk-state-disabled-opacity)]'
                  : 'hover:bg-hawk-hovered',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <HawkText
                  variant="body"
                  ink={isSelected ? 'accent' : 'default'}
                  className={cn(isSelected && 'font-semibold')}
                  clamp={1}
                >
                  {option.label}
                </HawkText>
                {option.description && (
                  <HawkText variant="caption" ink="muted" clamp={1}>
                    {option.description}
                  </HawkText>
                )}
              </span>
              {isSelected && <HawkIcon icon={IconCheck} size={15} className="text-hawk-acc" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Closes the menu on an outside click.
 *
 * Uses `mousedown` rather than `click` so the menu is gone before the click
 * lands on whatever is beneath — otherwise a tap on a button behind the menu
 * both closes the menu and fires that button.
 */
function useDismissOnOutside(
  active: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, ref, onDismiss]);
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkDropdownProps<T extends string> {
  options: ReadonlyArray<HawkSelectOption<T>>;
  value?: T;
  onChange?: (value: T) => void;
  label?: string;
  hint?: ReactNode;
  placeholder?: string;
  state?: HawkFieldState;
  dataState?: HawkDataState;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  required?: boolean;
  id?: string;
  className?: string;
}

export function HawkDropdown<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
  placeholder = 'Select',
  state = {},
  dataState = HawkDataState.FRESH,
  emptyMessage = 'Nothing to choose from',
  errorMessage,
  onRetry,
  required = false,
  id: providedId,
  className,
}: HawkDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { id } = useFieldIds(providedId);
  const inert = isInert(state);

  useDismissOnOutside(open, rootRef, () => setOpen(false));

  const selected = options.find((o) => o.value === value);

  const move = (delta: number) => {
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length === 0) return;
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <HawkField label={label} hint={hint} state={state} required={required} htmlFor={id}>
        <HawkFieldBox
          state={state}
          focused={open}
          onClick={inert ? undefined : () => setOpen((o) => !o)}
          className={cn(!inert && 'cursor-pointer')}
          trailing={
            <HawkIcon
              icon={IconChevronDown}
              size={16}
              className={cn(
                'hawk-motion text-hawk-ink-muted transition-transform duration-hawk-fast',
                open && 'rotate-180',
              )}
            />
          }
        >
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={showsError(state) || undefined}
            disabled={inert}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!open) setOpen(true);
                else move(1);
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                move(-1);
              }
              if (event.key === 'Enter' && open && activeIndex >= 0) {
                event.preventDefault();
                const option = options[activeIndex];
                if (option && !option.disabled) {
                  onChange?.(option.value);
                  setOpen(false);
                }
              }
              if (event.key === 'Escape') setOpen(false);
            }}
            className={cn(
              'w-full truncate bg-transparent text-left text-hawk-body outline-none',
              selected ? 'text-hawk-ink' : 'text-hawk-ink-disabled',
            )}
          >
            {selected?.label ?? placeholder}
          </button>
        </HawkFieldBox>
      </HawkField>

      {open && (
        <div className="absolute left-0 right-0 z-hawk-popover mt-hawk-3 overflow-hidden rounded-hawk-sm border border-hawk-line bg-hawk-paper shadow-hawk-popover">
          <Menu
            options={options}
            selected={value === undefined ? [] : [value]}
            onPick={(picked) => {
              onChange?.(picked);
              setOpen(false);
            }}
            dataState={dataState}
            emptyMessage={emptyMessage}
            errorMessage={errorMessage}
            onRetry={onRetry}
            activeIndex={activeIndex}
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkComboboxProps<T extends string> extends Omit<
  HawkDropdownProps<T>,
  'value' | 'onChange'
> {
  value?: T;
  onChange?: (value: T) => void;
  /** Search text, when the caller filters server-side. */
  query?: string;
  onQueryChange?: (query: string) => void;
}

/**
 * A dropdown you can type into.
 *
 * Filters locally when `onQueryChange` is absent, and defers to the caller when
 * it is present — a combobox over a paginated endpoint must not silently filter
 * only the page it happens to be holding.
 */
export function HawkCombobox<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
  placeholder = 'Search',
  state = {},
  dataState = HawkDataState.FRESH,
  emptyMessage = 'No matches',
  errorMessage,
  onRetry,
  required = false,
  query,
  onQueryChange,
  id: providedId,
  className,
}: HawkComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { id } = useFieldIds(providedId);
  const inert = isInert(state);

  useDismissOnOutside(open, rootRef, () => setOpen(false));

  const controlledQuery = onQueryChange !== undefined;
  const text = controlledQuery ? (query ?? '') : localQuery;

  const visible = controlledQuery
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(localQuery.toLowerCase()));

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <HawkField label={label} hint={hint} state={state} required={required} htmlFor={id}>
        <HawkFieldBox
          state={state}
          focused={open}
          leading={<HawkIcon icon={IconSearch} size={16} className="text-hawk-ink-muted" />}
        >
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            value={open ? text : (selected?.label ?? text)}
            placeholder={placeholder}
            disabled={inert}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setOpen(true);
              if (controlledQuery) onQueryChange?.(event.target.value);
              else setLocalQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
            className={HAWK_INPUT_CLASS}
          />
        </HawkFieldBox>
      </HawkField>

      {open && (
        <div className="absolute left-0 right-0 z-hawk-popover mt-hawk-3 overflow-hidden rounded-hawk-sm border border-hawk-line bg-hawk-paper shadow-hawk-popover">
          <Menu
            options={visible}
            selected={value === undefined ? [] : [value]}
            onPick={(picked) => {
              onChange?.(picked);
              setOpen(false);
              if (!controlledQuery) setLocalQuery('');
            }}
            dataState={dataState}
            emptyMessage={emptyMessage}
            errorMessage={errorMessage}
            onRetry={onRetry}
            activeIndex={-1}
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkMultiSelectProps<T extends string> {
  options: ReadonlyArray<HawkSelectOption<T>>;
  value?: readonly T[];
  onChange?: (value: T[]) => void;
  label?: string;
  hint?: ReactNode;
  placeholder?: string;
  state?: HawkFieldState;
  dataState?: HawkDataState;
  emptyMessage?: string;
  /** Cap on selections — the interests picker allows at most five. */
  max?: number;
  required?: boolean;
  className?: string;
}

/** Multi-select with the chosen values shown as removable chips. */
export function HawkMultiSelect<T extends string>({
  options,
  value = [],
  onChange,
  label,
  hint,
  placeholder = 'Select',
  state = {},
  dataState = HawkDataState.FRESH,
  emptyMessage = 'Nothing to choose from',
  max,
  required = false,
  className,
}: HawkMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inert = isInert(state);

  useDismissOnOutside(open, rootRef, () => setOpen(false));

  const atMax = max !== undefined && value.length >= max;

  const toggle = (picked: T) => {
    if (value.includes(picked)) {
      onChange?.(value.filter((v) => v !== picked));
    } else if (!atMax) {
      onChange?.([...value, picked]);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <HawkField
        label={label}
        hint={hint}
        state={state}
        required={required}
        labelAdornment={
          max !== undefined ? (
            <HawkText variant="caption" ink="muted" record>
              {value.length}/{max}
            </HawkText>
          ) : undefined
        }
      >
        <HawkFieldBox
          state={state}
          focused={open}
          auto
          onClick={inert ? undefined : () => setOpen((o) => !o)}
          className={cn(!inert && 'cursor-pointer')}
          trailing={
            <HawkIcon
              icon={IconChevronDown}
              size={16}
              className={cn(
                'hawk-motion text-hawk-ink-muted transition-transform duration-hawk-fast',
                open && 'rotate-180',
              )}
            />
          }
        >
          {value.length === 0 ? (
            <span className="text-hawk-body text-hawk-ink-disabled">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-hawk-2">
              {value.map((picked) => {
                const option = options.find((o) => o.value === picked);
                return (
                  <span
                    key={picked}
                    className="inline-flex items-center gap-hawk-2 rounded-hawk-pill bg-hawk-acc-soft px-hawk-4 py-hawk-1 text-hawk-caption font-medium text-hawk-acc-on-soft"
                  >
                    {option?.label ?? picked}
                    {!inert && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${option?.label ?? picked}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle(picked);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.stopPropagation();
                            event.preventDefault();
                            toggle(picked);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <HawkIcon icon={IconClose} size={11} />
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          )}
        </HawkFieldBox>
      </HawkField>

      {open && (
        <div className="absolute left-0 right-0 z-hawk-popover mt-hawk-3 overflow-hidden rounded-hawk-sm border border-hawk-line bg-hawk-paper shadow-hawk-popover">
          <Menu
            options={
              // At the cap, unselected options are disabled rather than hidden:
              // hiding them would make the list appear to lose entries, and the
              // user could not see what they would gain by deselecting.
              atMax
                ? options.map((o) => (value.includes(o.value) ? o : { ...o, disabled: true }))
                : options
            }
            selected={value}
            onPick={toggle}
            dataState={dataState}
            emptyMessage={emptyMessage}
            activeIndex={-1}
          />
        </div>
      )}
    </div>
  );
}

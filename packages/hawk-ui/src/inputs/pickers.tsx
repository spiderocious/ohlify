import { useRef, useState, type ReactNode } from 'react';

import { isInert, type HawkFieldState } from '../contracts/field-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import {
  IconCalendar,
  IconClock,
  IconClose,
  IconFile,
  IconImage,
  IconUpload,
} from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HAWK_INPUT_CLASS, HawkField, HawkFieldBox, useFieldIds } from './field.js';

export interface HawkDateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  min?: string;
  max?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * Date and time inputs use the **native** pickers.
 *
 * A hand-rolled calendar is a large surface to get wrong — locale, keyboard
 * navigation, screen-reader semantics — and the native control already handles
 * all three, including the mobile wheel that users know. The design system
 * styles the box; the platform owns the picker.
 *
 * Values are ISO strings (`YYYY-MM-DD`, `HH:mm`), which is what the backend
 * expects and what the native control emits, so nothing has to parse anything.
 */
export function HawkDateInput({
  value,
  onChange,
  label,
  hint,
  state = {},
  min,
  max,
  required = false,
  id: providedId,
  className,
}: HawkDateInputProps) {
  const [focused, setFocused] = useState(false);
  const { id } = useFieldIds(providedId);

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
        leading={<HawkIcon icon={IconCalendar} size={16} className="text-hawk-ink-muted" />}
      >
        <input
          id={id}
          type="date"
          value={value ?? ''}
          min={min}
          max={max}
          disabled={state.disabled}
          readOnly={state.readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(event.target.value)}
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

export interface HawkTimeInputProps extends Omit<HawkDateInputProps, 'min' | 'max'> {
  min?: string;
  max?: string;
}

export function HawkTimeInput({
  value,
  onChange,
  label,
  hint,
  state = {},
  min,
  max,
  required = false,
  id: providedId,
  className,
}: HawkTimeInputProps) {
  const [focused, setFocused] = useState(false);
  const { id } = useFieldIds(providedId);

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
        leading={<HawkIcon icon={IconClock} size={16} className="text-hawk-ink-muted" />}
      >
        <input
          id={id}
          type="time"
          value={value ?? ''}
          min={min}
          max={max}
          disabled={state.disabled}
          readOnly={state.readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(event.target.value)}
          className={HAWK_INPUT_CLASS}
        />
      </HawkFieldBox>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkChipInputProps {
  value?: readonly string[];
  onChange?: (value: string[]) => void;
  label?: string;
  hint?: ReactNode;
  placeholder?: string;
  state?: HawkFieldState;
  max?: number;
  className?: string;
}

/** Free-text tags — Enter or comma commits, Backspace on empty removes the last. */
export function HawkChipInput({
  value = [],
  onChange,
  label,
  hint,
  placeholder = 'Add and press Enter',
  state = {},
  max,
  className,
}: HawkChipInputProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inert = isInert(state);
  const atMax = max !== undefined && value.length >= max;

  const commit = () => {
    const trimmed = draft.trim();
    // Silently ignore duplicates rather than erroring: the user's intent is
    // already satisfied, and an error for "it is already there" is noise.
    if (!trimmed || atMax || value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange?.([...value, trimmed]);
    setDraft('');
  };

  return (
    <HawkField
      label={label}
      hint={hint}
      state={state}
      className={className}
      labelAdornment={
        max !== undefined ? (
          <HawkText variant="caption" ink="muted" record>
            {value.length}/{max}
          </HawkText>
        ) : undefined
      }
    >
      <HawkFieldBox state={state} focused={focused} auto>
        <div className="flex flex-wrap items-center gap-hawk-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-hawk-2 rounded-hawk-pill bg-hawk-acc-soft px-hawk-4 py-hawk-1 text-hawk-caption font-medium text-hawk-acc-on-soft"
            >
              {tag}
              {!inert && (
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange?.(value.filter((v) => v !== tag))}
                  className="hawk-focusable rounded-full"
                >
                  <HawkIcon icon={IconClose} size={11} />
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            value={draft}
            placeholder={value.length === 0 ? placeholder : undefined}
            disabled={inert || atMax}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                commit();
              }
              if (event.key === 'Backspace' && draft === '' && value.length > 0) {
                onChange?.(value.slice(0, -1));
              }
            }}
            className={cn(HAWK_INPUT_CLASS, 'w-auto min-w-[8rem] flex-1')}
          />
        </div>
      </HawkFieldBox>
    </HawkField>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkUploadedFile {
  id: string;
  name: string;
  /** Bytes. */
  size?: number;
  /** 0–1 while uploading; absent once done. */
  progress?: number;
  error?: string;
  /** Preview URL for an image. */
  previewUrl?: string;
}

export interface HawkFileUploadProps {
  files?: readonly HawkUploadedFile[];
  onSelect?: (files: FileList) => void;
  onRemove?: (id: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  accept?: string;
  multiple?: boolean;
  /** Copy for the drop target. */
  prompt?: string;
  className?: string;
}

/**
 * File upload with a drop target and per-file rows.
 *
 * Each file carries its own progress and its own error, rather than the widget
 * having one error for the batch: on a KYC upload, "one of these three failed"
 * is not actionable — the user needs to know *which*.
 */
export function HawkFileUpload({
  files = [],
  onSelect,
  onRemove,
  label,
  hint,
  state = {},
  accept,
  multiple = false,
  prompt = 'Drop a file here, or browse',
  className,
}: HawkFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const inert = isInert(state);

  return (
    <HawkField label={label} hint={hint} state={state} className={className}>
      <div
        onDragOver={(event) => {
          if (inert) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (inert) return;
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length > 0) onSelect?.(event.dataTransfer.files);
        }}
        onClick={inert ? undefined : () => inputRef.current?.click()}
        className={cn(
          'hawk-motion flex cursor-pointer flex-col items-center justify-center gap-hawk-3',
          'rounded-hawk-sm border border-dashed px-hawk-6 py-hawk-8 text-center',
          'transition-colors duration-hawk-fast',
          dragging ? 'border-hawk-acc bg-hawk-acc-soft' : 'border-hawk-line-strong bg-hawk-stock',
          state.error && !state.disabled && 'border-hawk-critical',
          inert && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        )}
      >
        <HawkIcon icon={IconUpload} size={20} className="text-hawk-ink-muted" />
        <HawkText variant="caption" ink="muted">
          {prompt}
        </HawkText>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={inert}
          onChange={(event) => {
            if (event.target.files) onSelect?.(event.target.files);
            // Reset, so selecting the same file twice still fires a change.
            event.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-hawk-4 flex flex-col gap-hawk-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-hawk-4 rounded-hawk-sm border border-hawk-line bg-hawk-paper px-hawk-5 py-hawk-4"
            >
              <HawkIcon
                icon={file.previewUrl ? IconImage : IconFile}
                size={16}
                className="text-hawk-ink-muted"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <HawkText variant="label" clamp={1}>
                  {file.name}
                </HawkText>
                {file.error ? (
                  <HawkText variant="caption" className="text-hawk-critical">
                    {file.error}
                  </HawkText>
                ) : file.progress !== undefined ? (
                  <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-hawk-sunken">
                    <span
                      className="hawk-motion block h-full rounded-full bg-hawk-acc transition-[width] duration-hawk-base"
                      style={{ width: `${Math.round(file.progress * 100)}%` }}
                    />
                  </span>
                ) : (
                  file.size !== undefined && (
                    <HawkText variant="caption" ink="muted" record>
                      {formatBytes(file.size)}
                    </HawkText>
                  )
                )}
              </span>
              {onRemove && !inert && (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemove(file.id)}
                  className="hawk-focusable rounded-hawk-xs p-1 text-hawk-ink-muted hover:text-hawk-critical"
                >
                  <HawkIcon icon={IconClose} size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </HawkField>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSlot {
  /** ISO time, `HH:mm`. */
  time: string;
  available: boolean;
  /** Why it cannot be booked — shown as the title. */
  reason?: string;
}

export interface HawkSlotPickerProps {
  slots: ReadonlyArray<HawkSlot>;
  value?: string;
  onChange?: (time: string) => void;
  label?: string;
  hint?: ReactNode;
  state?: HawkFieldState;
  className?: string;
}

/**
 * The slot picker — booking a call.
 *
 * Unavailable slots stay visible rather than being filtered out. Seeing that
 * 14:00 exists but is taken tells the user something real about demand;
 * silently omitting it makes the day look sparse and the professional look
 * unavailable.
 */
export function HawkSlotPicker({
  slots,
  value,
  onChange,
  label,
  hint,
  state = {},
  className,
}: HawkSlotPickerProps) {
  const inert = isInert(state);

  return (
    <HawkField label={label} hint={hint} state={state} className={className}>
      <div className="grid grid-cols-3 gap-hawk-3 sm:grid-cols-4">
        {slots.map((slot) => {
          const selected = slot.time === value;
          const usable = slot.available && !inert;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!usable}
              title={slot.reason}
              aria-pressed={selected}
              onClick={() => onChange?.(slot.time)}
              className={cn(
                'hawk-focusable hawk-record h-10 rounded-hawk-sm border text-hawk-label',
                'font-semibold tabular-nums transition-colors duration-hawk-fast',
                selected
                  ? 'border-hawk-acc bg-hawk-acc text-hawk-acc-on'
                  : usable
                    ? 'border-hawk-line bg-hawk-paper text-hawk-ink hover:border-hawk-acc-border hover:text-hawk-acc'
                    : 'border-hawk-line bg-hawk-sunken text-hawk-ink-disabled line-through',
                !usable && 'cursor-not-allowed',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </HawkField>
  );
}

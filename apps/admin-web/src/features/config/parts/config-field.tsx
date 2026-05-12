import { useId } from 'react';

import { AppDropdownInput, AppText, AppTextInput, cn } from '@ohlify/ui';

import type { ConfigKeyDef } from '../lib/config-registry.js';
import { previewForKind } from '../lib/config-codec.js';

interface ConfigFieldProps {
  def: ConfigKeyDef;
  value: string;
  error?: string | null;
  onChange: (next: string) => void;
}

/**
 * One typed input row. The kind decides which control we render and how
 * the value is hinted (₦ prefix, % suffix, "≈ 1 hour" preview, etc).
 *
 * Errors come from the codec — display them inline so the user sees
 * exactly which field is invalid before hitting Save.
 */
export function ConfigField({ def, value, error, onChange }: ConfigFieldProps) {
  const id = useId();
  const preview = previewForKind(def.kind, value);

  return (
    <div className="flex flex-col gap-1">
      <ConfigInput def={def} id={id} value={value} onChange={onChange} hasError={Boolean(error)} />
      {(preview || error) && (
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          {error ? (
            <AppText variant="bodySmall" className="text-red-700">
              {error}
            </AppText>
          ) : (
            <span />
          )}
          {preview && (
            <AppText variant="bodySmall" className="text-text-muted">
              {preview}
            </AppText>
          )}
        </div>
      )}
    </div>
  );
}

interface InputProps {
  def: ConfigKeyDef;
  id: string;
  value: string;
  hasError: boolean;
  onChange: (next: string) => void;
}

function ConfigInput({ def, value, onChange, hasError }: InputProps) {
  switch (def.kind) {
    case 'boolean':
      return <ToggleInput value={value === 'true'} onChange={(v) => onChange(v ? 'true' : 'false')} />;

    case 'enum':
      return (
        <AppDropdownInput
          options={(def.enumOptions ?? []).map((o) => ({ label: o.label, value: o.value }))}
          value={value}
          onChange={onChange}
        />
      );

    case 'money_kobo':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="decimal"
          placeholder="0.00"
          startIcon={<UnitChip>₦</UnitChip>}
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'percent_bps':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="decimal"
          placeholder="0"
          endIcon={<UnitChip>%</UnitChip>}
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'duration_seconds':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="numeric"
          placeholder="0"
          endIcon={<UnitChip>seconds</UnitChip>}
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'duration_minutes':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="numeric"
          placeholder="0"
          endIcon={<UnitChip>minutes</UnitChip>}
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'duration_days':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="numeric"
          placeholder="0"
          endIcon={<UnitChip>days</UnitChip>}
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'number':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          inputMode="numeric"
          placeholder="0"
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );

    case 'string':
      return (
        <AppTextInput value={value} onChange={onChange} errorMessage={hasError ? '' : undefined} />
      );

    case 'string_array':
    case 'number_array':
      return (
        <AppTextInput
          value={value}
          onChange={onChange}
          placeholder="comma, separated, values"
          {...(hasError ? { errorMessage: ' ' } : {})}
        />
      );
  }
}

function UnitChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </span>
  );
}

function ToggleInput({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors',
        value ? 'bg-emerald-500' : 'bg-secondary',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-6 w-6 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
      <span className="sr-only">{value ? 'On' : 'Off'}</span>
    </button>
  );
}

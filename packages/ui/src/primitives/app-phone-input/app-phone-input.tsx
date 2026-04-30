import { IconChevronDown } from '@icons';
import { useId, useState, type CSSProperties } from 'react';


import { cn } from '../../utils/cn.js';

interface AppPhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  /** Show the ▾ caret next to the country code. Defaults to false. */
  canSelectCountryCode?: boolean;
  label?: string;
  className?: string;
  name?: string;
}

const NG_FLAG = (
  // 🇳🇬 — three vertical bands: green, white, green
  <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
    <rect width="22" height="14" rx="2" fill="#fff" />
    <rect width="7.33" height="14" fill="#008751" />
    <rect x="14.66" width="7.33" height="14" fill="#008751" />
  </svg>
);

/**
 * Mirrors mobile/lib/ui/widgets/app_phone_input/app_phone_input.dart.
 * NG-only for v1, +234 prefix, digits-only filter, 12px radius, focus glow.
 */
export function AppPhoneInput({
  value,
  onChange,
  placeholder = '000 000 0000',
  disabled = false,
  bordered = true,
  borderColor = 'var(--ohl-border)',
  errorMessage,
  canSelectCountryCode = false,
  label,
  className,
  name,
}: AppPhoneInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  const effectiveBorder = errorMessage
    ? 'var(--ohl-error)'
    : focused
      ? 'var(--ohl-primary)'
      : bordered
        ? borderColor
        : 'transparent';
  const showBorder = bordered || Boolean(errorMessage) || focused;

  const containerStyle: CSSProperties = {
    backgroundColor: disabled ? 'var(--ohl-surface)' : 'var(--ohl-background)',
    borderRadius: 12,
    border: showBorder ? `${focused ? 1.5 : 1}px solid ${effectiveBorder}` : 'none',
    transition: 'border-color 150ms ease',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/[^0-9]/g, '');
    onChange?.(next);
  };

  return (
    <div className={cn('flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div style={containerStyle} className="flex items-center">
        <div className="flex items-center gap-1.5 pl-3.5 pr-1">
          {NG_FLAG}
          <span className="text-base font-normal text-text-primary">+234</span>
          {canSelectCountryCode ? (
            <IconChevronDown size={16} color="var(--ohl-text-slate)" />
          ) : null}
        </div>
        <span className="mx-2 h-6 w-px self-center bg-border" />
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          value={value ?? ''}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent py-3.5 pr-4 text-base text-text-primary outline-none placeholder:text-text-slate"
        />
      </div>
      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

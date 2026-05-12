import { useId, useState } from 'react';

import { cn } from '../../utils/cn.js';

interface AppTimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  label?: string;
  className?: string;
}

/**
 * Mirrors the AppTextInput design — 12px radius, primary border on focus,
 * 52px height — but renders <input type="time"> so the browser provides a
 * native time picker rather than free text entry.
 */
export function AppTimeInput({
  value,
  onChange,
  disabled = false,
  bordered = true,
  borderColor = 'var(--ohl-border)',
  errorMessage,
  label,
  className,
}: AppTimeInputProps) {
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

  return (
    <div className={cn('flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div
        style={{
          backgroundColor: disabled ? 'var(--ohl-surface)' : 'var(--ohl-background)',
          borderRadius: 12,
          border: showBorder ? `${focused ? 1.5 : 1}px solid ${effectiveBorder}` : 'none',
          transition: 'border-color 150ms ease, border-width 150ms ease',
          height: 52,
        }}
        className="flex items-center"
      >
        <input
          id={id}
          type="time"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={cn(
            'flex-1 bg-transparent outline-none',
            'px-4 text-base text-text-primary',
            'placeholder:text-text-slate placeholder:font-normal',
            '[color-scheme:light]',
          )}
        />
      </div>
      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

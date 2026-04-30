import { useId, useState, type CSSProperties } from 'react';

import { cn } from '../../utils/cn.js';

interface AppTextAreaInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  maxLength?: number;
  minLines?: number;
  maxLines?: number;
  label?: string;
  className?: string;
  name?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_text_area_input/app_text_area_input.dart.
 * Default 3 minLines, 6 maxLines (rows). 12px radius, 150ms transition.
 */
export function AppTextAreaInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  bordered = true,
  borderColor = 'var(--ohl-border)',
  errorMessage,
  maxLength,
  minLines = 3,
  maxLines = 6,
  label,
  className,
  name,
}: AppTextAreaInputProps) {
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

  return (
    <div className={cn('flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div style={containerStyle}>
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={minLines}
          style={{ maxHeight: `${maxLines * 1.5}em` }}
          className="block w-full resize-none bg-transparent px-4 py-3.5 text-base text-text-primary outline-none placeholder:font-normal placeholder:text-text-slate"
        />
      </div>
      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

import {
  forwardRef,
  type CSSProperties,
  type HTMLInputTypeAttribute,
  type ReactNode,
  type Ref,
  useId,
  useState,
} from 'react';

import { cn } from '../../utils/cn.js';

export type CharSupported = 'all' | 'number' | 'text' | 'textWithEmoji';

interface AppTextInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  maxLength?: number;
  minLength?: number;
  charSupported?: CharSupported;
  /** Override regex used to filter keystrokes. */
  pattern?: RegExp;
  obscureText?: boolean;
  inputType?: HTMLInputTypeAttribute;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal' | 'search' | 'url';
  onSubmit?: (value: string) => void;
  label?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  style?: CSSProperties;
  name?: string;
  ariaLabel?: string;
}

const FILTERS: Record<CharSupported, RegExp | null> = {
  all: null,
  number: /^[0-9]*$/,
  text: /^[a-zA-Z\s]*$/,
  textWithEmoji: null,
};

/**
 * Mirrors mobile/lib/ui/widgets/app_text_input/app_text_input.dart.
 * Border swaps to primary on focus, error on errorMessage, transparent when
 * not bordered. 12px radius, 150ms ease transition, MonaSans 16px text.
 */
export const AppTextInput = forwardRef(function AppTextInput(
  props: AppTextInputProps,
  ref: Ref<HTMLInputElement>,
) {
  const {
    value,
    onChange,
    placeholder,
    disabled = false,
    bordered = true,
    borderColor = 'var(--ohl-border)',
    errorMessage,
    startIcon,
    endIcon,
    maxLength,
    charSupported = 'all',
    pattern,
    obscureText = false,
    inputType,
    inputMode,
    onSubmit,
    label,
    autoFocus = false,
    className,
    inputClassName,
    style,
    name,
    ariaLabel,
  } = props;

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
    transition: 'border-color 150ms ease, border-width 150ms ease',
    ...style,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const filter = pattern ?? FILTERS[charSupported];
    if (filter && next !== '' && !filter.test(next)) return;
    onChange?.(next);
  };

  const resolvedType = obscureText ? 'password' : (inputType ?? 'text');

  return (
    <div className={cn('flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div style={containerStyle} className="flex items-center">
        {startIcon ? (
          <span className="flex shrink-0 items-center pl-3.5 pr-2 text-text-slate">
            {startIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          name={name}
          type={resolvedType}
          inputMode={inputMode}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) {
              onSubmit((e.target as HTMLInputElement).value);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-label={ariaLabel ?? label}
          className={cn(
            'flex-1 bg-transparent outline-none',
            'placeholder:text-text-slate placeholder:font-normal',
            'px-4 py-3.5 text-base text-text-primary',
            startIcon ? 'pl-0' : '',
            endIcon ? 'pr-0' : '',
            inputClassName,
          )}
        />
        {endIcon ? (
          <span className="flex shrink-0 items-center pr-3.5 pl-2 text-text-slate">{endIcon}</span>
        ) : null}
      </div>
      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
});

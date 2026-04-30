import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '../../utils/cn.js';

interface AppOtpInputProps {
  length?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  errorMessage?: string;
  bordered?: boolean;
  borderColor?: string;
  className?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_otp_input/app_otp_input.dart.
 * One cell per digit, auto-advance forward + back on backspace,
 * paste-fills all cells, 56px tall cells with 12px radius.
 */
export function AppOtpInput({
  length = 6,
  autoFocus = true,
  onComplete,
  onChange,
  disabled = false,
  errorMessage,
  bordered = true,
  borderColor = 'var(--ohl-border)',
  className,
}: AppOtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ''));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (i: number, v: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      const full = next.join('');
      onChange?.(full);
      if (full.length === length && !next.some((d) => d === '')) {
        onComplete?.(full);
      }
      return next;
    });
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/[^0-9]/g, '');
    if (digit === '') {
      setAt(i, '');
      return;
    }
    // Take the LAST char so the user can overwrite while focused.
    setAt(i, digit[digit.length - 1] ?? '');
    if (i < length - 1) refs.current[i + 1]?.focus();
    else refs.current[i]?.blur();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && digits[i] === '' && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => pasted[i] ?? '');
    setDigits(next);
    const full = next.join('');
    onChange?.(full);
    if (pasted.length === length) onComplete?.(full);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className={cn('flex w-full flex-col items-stretch font-sans', className)}>
      <div className="flex items-stretch justify-center gap-2.5">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i] ?? ''}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            style={{
              borderColor: errorMessage ? 'var(--ohl-error)' : borderColor,
            }}
            className={cn(
              'h-14 flex-1 rounded-md text-center text-xl font-semibold text-text-primary transition-all outline-none',
              bordered ? 'border' : '',
              'focus:border-primary focus:border-[1.5px]',
              disabled ? 'bg-surface' : 'bg-background',
            )}
          />
        ))}
      </div>
      {errorMessage ? (
        <p className="mt-1.5 text-center text-xs text-error">{errorMessage}</p>
      ) : null}
    </div>
  );
}

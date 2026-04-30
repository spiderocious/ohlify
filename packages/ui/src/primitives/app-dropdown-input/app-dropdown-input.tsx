import { IconCheck, IconChevronDown, IconSearch } from '@icons';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';


import { cn } from '../../utils/cn.js';

export interface DropdownOption<T> {
  label: string;
  value: T;
  icon?: ReactNode;
}

interface AppDropdownInputProps<T> {
  options: ReadonlyArray<DropdownOption<T>>;
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  searchable?: boolean;
  label?: string;
  className?: string;
  /** Compare values when picking the selected option. Defaults to ===. */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_dropdown_input/app_dropdown_input.dart.
 * Tap target opens a positioned overlay with optional search filter.
 */
export function AppDropdownInput<T>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  bordered = false,
  borderColor = 'var(--ohl-border)',
  errorMessage,
  searchable = false,
  label,
  className,
  isEqual,
}: AppDropdownInputProps<T>) {
  const id = useId();
  const targetRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const eq = isEqual ?? ((a: T, b: T) => a === b);

  const selected = useMemo(
    () => (value === undefined ? undefined : options.find((o) => eq(o.value, value))),
    [options, value, eq],
  );

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // Close on outside click + ESC
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && !targetRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        setOpen(false);
        setSearch('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const showBorder = bordered || Boolean(errorMessage) || open;
  const effectiveBorder = errorMessage
    ? 'var(--ohl-error)'
    : open
      ? 'var(--ohl-primary)'
      : borderColor;

  const targetStyle: CSSProperties = {
    backgroundColor: disabled ? 'var(--ohl-surface)' : 'var(--ohl-background)',
    borderRadius: 12,
    border: showBorder ? `${open ? 1.5 : 1}px solid ${effectiveBorder}` : 'none',
    height: 52,
    transition: 'border-color 150ms ease',
  };

  return (
    <div className={cn('relative flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}

      <button
        ref={targetRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={targetStyle}
        className="flex items-center gap-2 px-4 text-left"
      >
        {selected?.icon ? (
          <span className="inline-flex shrink-0 items-center">{selected.icon}</span>
        ) : null}
        <span
          className={cn(
            'flex-1 truncate text-base font-normal',
            selected ? 'text-text-primary' : 'text-text-slate',
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <IconChevronDown
          size={20}
          color="var(--ohl-text-slate)"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>

      {open ? (
        <div
          ref={popupRef}
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-md border border-border bg-background shadow-lg"
          style={{ top: '100%', maxHeight: 240 }}
        >
          {searchable ? (
            <div className="p-2">
              <div className="flex items-center gap-2 rounded-sm border border-border px-2 py-1.5 focus-within:border-primary">
                <IconSearch size={16} color="var(--ohl-text-slate)" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="IconSearch..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-slate"
                />
              </div>
            </div>
          ) : null}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.map((opt, i) => {
              const isSelected = selected ? eq(selected.value, opt.value) : false;
              return (
                <li key={`${i}-${opt.label}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-3 text-left text-[15px] transition',
                      isSelected
                        ? 'bg-secondary/50 font-semibold text-primary'
                        : 'hover:bg-surface',
                    )}
                  >
                    {opt.icon ? (
                      <span className="inline-flex shrink-0 items-center">{opt.icon}</span>
                    ) : null}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected ? <IconCheck size={16} color="var(--ohl-primary)" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

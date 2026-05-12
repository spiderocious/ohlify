import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { IconCheck, IconChevronDown, IconSearch } from '@icons';


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

const POPUP_GAP_PX = 6;
const POPUP_MAX_HEIGHT_PX = 240;
const VIEWPORT_MARGIN_PX = 8;

interface PopupRect {
  top: number;
  left: number;
  width: number;
  /** When true the popup is rendered ABOVE the trigger because there isn't enough room below. */
  above: boolean;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_dropdown_input/app_dropdown_input.dart.
 *
 * Tap target opens a popup with optional search filter. The popup is
 * **portaled to `document.body`** with a fixed position computed from the
 * trigger's bounding rect, so it can never be clipped by an ancestor that
 * sets `overflow: hidden` (notably modal cards). The position recomputes on
 * scroll + resize, so the popup tracks the trigger as the user scrolls
 * inside a modal or the page itself.
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
  const [popupRect, setPopupRect] = useState<PopupRect | null>(null);
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

  // Close on outside click + ESC. The popup is portaled to body so we have to
  // check both refs explicitly — neither is a DOM descendant of the other.
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

  const recomputePosition = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
    const spaceAbove = rect.top - VIEWPORT_MARGIN_PX;
    const flipAbove = spaceBelow < POPUP_MAX_HEIGHT_PX && spaceAbove > spaceBelow;
    setPopupRect({
      top: flipAbove ? rect.top - POPUP_GAP_PX : rect.bottom + POPUP_GAP_PX,
      left: rect.left,
      width: rect.width,
      above: flipAbove,
    });
  }, []);

  // Track trigger position so the popup follows the user's scroll/resize.
  // Listening with `capture: true` catches scrolls inside any ancestor
  // (modal scroll containers etc.).
  useEffect(() => {
    if (!open) return;
    recomputePosition();
    const onMove = () => recomputePosition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, recomputePosition]);

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

  const popupStyle: CSSProperties | null = popupRect
    ? {
        position: 'fixed',
        top: popupRect.top,
        left: popupRect.left,
        width: popupRect.width,
        maxHeight: POPUP_MAX_HEIGHT_PX,
        // Modal scrim is z-[1000]; the popup is portaled to <body> and must
        // sit above it, otherwise it renders behind the modal even though it
        // escaped the modal's stacking context.
        zIndex: 1100,
        // When flipped above, anchor the bottom of the popup at `top`.
        transform: popupRect.above ? 'translateY(-100%)' : undefined,
      }
    : null;

  const popupNode =
    open && popupStyle ? (
      <div
        ref={popupRef}
        style={popupStyle}
        className="overflow-hidden rounded-md border border-border bg-background shadow-lg"
      >
        {searchable ? (
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-sm border border-border px-2 py-1.5 focus-within:border-primary">
              <IconSearch size={16} color="var(--ohl-text-slate)" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
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
    ) : null;

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

      {popupNode && typeof document !== 'undefined'
        ? createPortal(popupNode, document.body)
        : null}

      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

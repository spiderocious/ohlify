import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { IconCheck, IconChevronDown, IconPlus, IconSearch } from '@icons';


import { cn } from '../../utils/cn.js';
import type { DropdownOption } from '../app-dropdown-input/app-dropdown-input.js';
import { AppTag } from '../app-tag/app-tag.js';

interface AppMultiSelectDropdownProps {
  options: ReadonlyArray<DropdownOption<string>>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  /** When true, the popup includes a free-text "add other" field. */
  allowOther?: boolean;
  otherPlaceholder?: string;
  className?: string;
}

const POPUP_GAP_PX = 6;
const POPUP_MAX_HEIGHT_PX = 320;
const VIEWPORT_MARGIN_PX = 8;

interface PopupRect {
  top: number;
  left: number;
  width: number;
  above: boolean;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_multi_select_dropdown/app_multi_select_dropdown.dart.
 * Selected values render as chips inside the field; popup lists checkboxes.
 *
 * The popup is portaled to `document.body` and positioned via a measured rect
 * so it isn't clipped by ancestor `overflow: hidden` (modals, scroll boxes).
 * Same approach as `AppDropdownInput`.
 */
export function AppMultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Search and select',
  label,
  allowOther = false,
  otherPlaceholder = 'Add a custom option',
  className,
}: AppMultiSelectDropdownProps) {
  const id = useId();
  const targetRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [other, setOther] = useState('');
  const [popupRect, setPopupRect] = useState<PopupRect | null>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

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

  const isSelected = (v: string) => selected.some((s) => s.toLowerCase() === v.toLowerCase());

  const toggle = (v: string) => {
    if (isSelected(v)) {
      onChange(selected.filter((s) => s.toLowerCase() !== v.toLowerCase()));
    } else {
      onChange([...selected, v]);
    }
  };

  const addOther = () => {
    const t = other.trim();
    if (!t || isSelected(t)) {
      setOther('');
      return;
    }
    onChange([...selected, t]);
    setOther('');
  };

  const containerStyle: CSSProperties = {
    backgroundColor: 'var(--ohl-background)',
    borderRadius: 12,
    border: `${open ? 1.5 : 1}px solid ${open ? 'var(--ohl-primary)' : 'var(--ohl-border)'}`,
    transition: 'border-color 150ms ease',
    minHeight: 52,
  };

  const popupStyle: CSSProperties | null = popupRect
    ? {
        position: 'fixed',
        top: popupRect.top,
        left: popupRect.left,
        width: popupRect.width,
        maxHeight: POPUP_MAX_HEIGHT_PX,
        // Modal scrim is z-[1000]; popup must sit above it.
        zIndex: 1100,
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
        <ul className="max-h-60 overflow-y-auto py-1">
          {filtered.map((opt, i) => {
            const sel = isSelected(opt.value);
            return (
              <li key={`${i}-${opt.label}`}>
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-[15px]',
                    sel ? 'bg-secondary/40 font-semibold text-primary' : 'hover:bg-surface',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm border-[1.5px]',
                      sel
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-transparent',
                    )}
                  >
                    {sel ? <IconCheck size={14} color="#fff" /> : null}
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {allowOther ? (
          <div className="border-t border-border p-2">
            <div className="flex items-center gap-2 rounded-sm border border-border px-2 py-1.5 focus-within:border-primary">
              <IconPlus size={16} color="var(--ohl-text-slate)" />
              <input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOther();
                  }
                }}
                placeholder={otherPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-slate"
              />
              <button type="button" onClick={addOther} aria-label="Add" className="text-primary">
                <IconCheck size={20} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className={cn('relative flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}

      <div
        ref={targetRef}
        id={id}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        style={containerStyle}
        className="flex items-center gap-2 px-3 py-2.5"
      >
        {selected.length === 0 ? (
          <span className="flex-1 text-base text-text-slate">{placeholder}</span>
        ) : (
          <div className="flex flex-1 flex-wrap gap-1.5">
            {selected.map((v) => (
              <AppTag
                key={v}
                label={v.toUpperCase()}
                variant="outline"
                size="small"
                endIcon={<span aria-hidden="true">×</span>}
                onTap={() => toggle(v)}
              />
            ))}
          </div>
        )}
        <IconChevronDown
          size={20}
          color="var(--ohl-text-slate)"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms',
          }}
        />
      </div>

      {popupNode && typeof document !== 'undefined'
        ? createPortal(popupNode, document.body)
        : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';

import { IconChevronLeft, IconChevronRight } from '@icons';


import { cn } from '../../utils/cn.js';

interface AppDateInputProps {
  value?: Date;
  onChange?: (value: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  minDate?: Date;
  maxDate?: Date;
  defaultDate?: Date;
  disabledDates?: Date[];
  weekendDisabled?: boolean;
  /** e.g. ['Monday', 'Tuesday'] */
  weekDaysDisabled?: string[];
  label?: string;
  className?: string;
}

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns ISO weekday 1..7 (Mon..Sun). */
function isoWeekday(d: Date): number {
  const w = d.getDay(); // 0..6 Sun..Sat
  return w === 0 ? 7 : w;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_date_input/app_date_input.dart.
 * Header has month nav arrows + month name; below is a horizontal strip of
 * day pills (80×88) with the day number + weekday short label.
 */
export function AppDateInput({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  bordered = true,
  borderColor = 'var(--ohl-border)',
  errorMessage,
  minDate,
  maxDate,
  defaultDate,
  disabledDates,
  weekendDisabled = false,
  weekDaysDisabled,
  label,
  className,
}: AppDateInputProps) {
  const [selected, setSelected] = useState<Date | undefined>(value ?? defaultDate);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const base = value ?? defaultDate ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const stripRef = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => {
    const total = daysInMonth(viewMonth.year, viewMonth.month);
    return Array.from(
      { length: total },
      (_, i) => new Date(viewMonth.year, viewMonth.month, i + 1),
    );
  }, [viewMonth]);

  // Auto-scroll the strip so the most useful day is visible by default.
  // Priority: the selected value > minDate (when it falls in this month) >
  // today (when it falls in this month) > strip start. Without this, a user
  // landing on the 27th of the month has to scroll right past 26 disabled
  // days to find their first selectable date.
  //
  // Tile layout: 80px wide, 12px gap (Tailwind `gap-3`). We use that to
  // compute the scroll offset by index — DOM measurement would be more
  // robust but the strip dimensions are stable enough that it's not worth
  // the extra ref bookkeeping.
  const TILE_WIDTH = 80;
  const TILE_GAP = 12;
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const targetDate = (() => {
      if (selected && selected.getFullYear() === viewMonth.year && selected.getMonth() === viewMonth.month) {
        return selected;
      }
      if (minDate && minDate.getFullYear() === viewMonth.year && minDate.getMonth() === viewMonth.month) {
        return minDate;
      }
      const today = new Date();
      if (today.getFullYear() === viewMonth.year && today.getMonth() === viewMonth.month) {
        return today;
      }
      return null;
    })();
    if (!targetDate) {
      strip.scrollLeft = 0;
      return;
    }

    const dayIndex = targetDate.getDate() - 1;
    // Position the target tile flush-left rather than off-screen, with a
    // little padding so it doesn't kiss the edge.
    const offset = Math.max(0, dayIndex * (TILE_WIDTH + TILE_GAP) - 4);
    strip.scrollLeft = offset;
    // Re-run whenever the visible month flips OR the user picks a new value.
  }, [viewMonth.year, viewMonth.month, selected?.getTime(), minDate?.getTime()]);

  const isDisabled = (d: Date) => {
    if (disabled) return true;
    if (minDate && d < startOfDay(minDate)) return true;
    if (maxDate && d > endOfDay(maxDate)) return true;
    if (weekendDisabled) {
      const w = isoWeekday(d);
      if (w === 6 || w === 7) return true;
    }
    if (weekDaysDisabled?.length) {
      const name = WEEKDAY_NAMES[isoWeekday(d) - 1];
      if (name && weekDaysDisabled.includes(name)) return true;
    }
    if (disabledDates?.some((dd) => isSameDay(dd, d))) return true;
    return false;
  };

  const showBorder = bordered || Boolean(errorMessage);

  return (
    <div className={cn('flex flex-col items-stretch font-sans', className)}>
      {label ? (
        <span className="mb-1.5 text-[13px] font-medium text-text-primary">{label}</span>
      ) : null}
      <div
        style={{
          backgroundColor: disabled ? 'var(--ohl-surface)' : 'var(--ohl-background)',
          borderRadius: 12,
          border: showBorder
            ? `1px solid ${errorMessage ? 'var(--ohl-error)' : borderColor}`
            : 'none',
          padding: '14px 16px 16px',
          transition: 'border-color 150ms ease',
        }}
      >
        <div className="flex items-center">
          <span className="text-sm font-normal text-text-slate">{placeholder}</span>
          <span className="flex-1" />
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setViewMonth(({ year, month }) =>
                month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
              )
            }
            aria-label="Previous month"
            className="text-text-jet"
          >
            <IconChevronLeft size={22} />
          </button>
          <span className="mx-1 text-[15px] font-bold text-text-jet">
            {MONTH_NAMES[viewMonth.month]}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setViewMonth(({ year, month }) =>
                month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
              )
            }
            aria-label="Next month"
            className="text-text-jet"
          >
            <IconChevronRight size={22} />
          </button>
        </div>

        <div
          ref={stripRef}
          className="mt-3.5 flex gap-3 overflow-x-auto"
          style={{ height: 88, scrollbarWidth: 'thin' }}
        >
          {days.map((day) => {
            const isSel = selected ? isSameDay(day, selected) : false;
            const dis = isDisabled(day);
            const weekdayLabel = WEEKDAY_NAMES[isoWeekday(day) - 1]?.slice(0, 3) ?? '';
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={dis}
                onClick={() => {
                  setSelected(day);
                  onChange?.(day);
                }}
                style={{
                  width: 80,
                  borderRadius: 14,
                  backgroundColor: isSel ? 'var(--ohl-primary)' : 'var(--ohl-surface)',
                  opacity: dis && !isSel ? 0.2 : 1,
                  transition: 'all 180ms',
                }}
                className="flex shrink-0 flex-col items-center justify-center"
              >
                <span
                  className="text-xl font-semibold"
                  style={{ color: isSel ? '#fff' : 'var(--ohl-text-disabled)' }}
                >
                  {day.getDate()}
                </span>
                <span
                  className="mt-0.5 text-[10px] font-normal"
                  style={{
                    color: isSel ? 'rgb(255 255 255 / 0.85)' : 'var(--ohl-text-disabled)',
                  }}
                >
                  {weekdayLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {errorMessage ? <p className="mt-1.5 text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

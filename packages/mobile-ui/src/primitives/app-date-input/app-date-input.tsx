import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';

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

/** 1 (Mon) .. 7 (Sun), matching Dart's DateTime.weekday. */
function isoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface AppDateInputProps {
  value?: Date;
  onChange?: (date: Date) => void;
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
  weekDaysDisabled?: string[];
  label?: string;
}

/**
 * A horizontal, scrollable per-month date strip (not a calendar grid). 1:1
 * with mobile/lib/ui/widgets/app_date_input/app_date_input.dart.
 */
export function AppDateInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  bordered = true,
  borderColor = colors.border,
  errorMessage,
  minDate,
  maxDate,
  defaultDate,
  disabledDates,
  weekendDisabled = false,
  weekDaysDisabled,
  label,
}: AppDateInputProps) {
  const [selected, setSelected] = useState<Date | undefined>(value ?? defaultDate);
  const seed = selected ?? new Date();
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());
  const scrollRef = useRef<ScrollView | null>(null);

  const days = useMemo(() => {
    const count = daysInMonth(viewYear, viewMonth);
    return Array.from({ length: count }, (_, i) => new Date(viewYear, viewMonth, i + 1));
  }, [viewYear, viewMonth]);

  function isDisabled(date: Date): boolean {
    if (disabled) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    if (weekendDisabled && (isoWeekday(date) === 6 || isoWeekday(date) === 7)) return true;
    if (weekDaysDisabled) {
      const dayName = WEEKDAY_NAMES[isoWeekday(date) - 1];
      if (dayName && weekDaysDisabled.includes(dayName)) return true;
    }
    if (disabledDates) {
      return disabledDates.some((d) => isSameDay(d, date));
    }
    return false;
  }

  function prevMonth() {
    const next = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }

  function nextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }

  return (
    <View style={{ alignItems: 'stretch' }}>
      {label ? (
        <>
          <Text
            style={{
              fontFamily: 'MonaSans-Medium',
              fontSize: 13,
              fontWeight: '500',
              color: colors.textPrimary,
            }}
          >
            {label}
          </Text>
          <View style={{ height: 6 }} />
        </>
      ) : null}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 16,
          backgroundColor: disabled ? colors.surface : colors.background,
          borderRadius: 12,
          borderWidth: bordered || errorMessage ? 1 : 0,
          borderColor: errorMessage ? colors.error : borderColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'MonaSans-Regular',
              fontSize: 14,
              fontWeight: '400',
              color: colors.textSlate,
            }}
          >
            {placeholder ?? 'Select date'}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={disabled ? undefined : prevMonth}>
            <AppIcon name="chevronLeft" size={22} color={colors.textBlack} />
          </Pressable>
          <View style={{ width: 4 }} />
          <Text
            style={{
              fontFamily: 'MonaSans-Bold',
              fontSize: 15,
              fontWeight: '700',
              color: colors.textBlack,
            }}
          >
            {MONTH_NAMES[viewMonth]}
          </Text>
          <View style={{ width: 4 }} />
          <Pressable onPress={disabled ? undefined : nextMonth}>
            <AppIcon name="chevronRight" size={22} color={colors.textBlack} />
          </Pressable>
        </View>
        <View style={{ height: 14 }} />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 88 }}
        >
          <View style={{ flexDirection: 'row' }}>
            {days.map((day, i) => {
              const isSelected = selected !== undefined && isSameDay(day, selected);
              const dayDisabled = isDisabled(day);
              const weekday = WEEKDAY_NAMES[isoWeekday(day) - 1]?.slice(0, 3) ?? '';
              return (
                <View key={day.toISOString()} style={{ marginLeft: i > 0 ? 12 : 0 }}>
                  <Pressable
                    disabled={dayDisabled}
                    onPress={() => {
                      setSelected(day);
                      onChange?.(day);
                    }}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 88,
                        borderRadius: 14,
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: dayDisabled && !isSelected ? 0.2 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'MonaSans-SemiBold',
                          fontSize: 20,
                          fontWeight: '600',
                          color: isSelected ? '#FFFFFF' : colors.textDisabled,
                        }}
                      >
                        {day.getDate()}
                      </Text>
                      <View style={{ height: 2 }} />
                      <Text
                        style={{
                          fontFamily: 'MonaSans-Regular',
                          fontSize: 10,
                          fontWeight: '400',
                          color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textDisabled,
                        }}
                      >
                        {weekday}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      {errorMessage ? (
        <>
          <View style={{ height: 6 }} />
          <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error }}>
            {errorMessage}
          </Text>
        </>
      ) : null}
    </View>
  );
}

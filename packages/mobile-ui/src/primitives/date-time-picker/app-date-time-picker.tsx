import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppButton } from '../app-button/app-button';
import { AppIcon } from '../../icons/app-icons';
import { AppText } from '../app-text/app-text';
import { colors } from '../../theme/colors';

/**
 * A self-contained, cross-platform date + time picker — a month calendar
 * grid plus horizontal hour/minute wheels — rendered in pure RN so it looks
 * and behaves identically on iOS, Android, and web. Replaces the old
 * native-spinner / raw-number-field fork (date-time-form.tsx +
 * date-time-form.web.tsx), which showed four editable number boxes on web
 * (a genuine bug magnet). 1:1 with
 * mobile/lib/ui/widgets/app_date_time_picker/app_date_time_picker.dart.
 */
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
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
const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export interface AppDateTimePickerProps {
  seed: Date;
  minimumDate?: Date;
  confirmLabel?: string;
  onConfirm: (date: Date) => void;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function AppDateTimePicker({
  seed,
  minimumDate,
  confirmLabel = 'Confirm',
  onConfirm,
}: AppDateTimePickerProps) {
  const min = minimumDate ?? new Date();
  const [selected, setSelected] = useState<Date>(seed);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    new Date(seed.getFullYear(), seed.getMonth(), 1),
  );

  const grid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const minDay = startOfDay(min);

  const canGoPrev =
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1) >
    new Date(minDay.getFullYear(), minDay.getMonth(), 1);

  function pickDay(day: Date) {
    const next = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      selected.getHours(),
      selected.getMinutes(),
    );
    setSelected(clampToMin(next, min));
  }

  function pickHour(hour: number) {
    setSelected((s) =>
      clampToMin(new Date(s.getFullYear(), s.getMonth(), s.getDate(), hour, s.getMinutes()), min),
    );
  }

  function pickMinute(minute: number) {
    setSelected((s) =>
      clampToMin(new Date(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours(), minute), min),
    );
  }

  return (
    <View>
      {/* Month header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Pressable
          onPress={() =>
            canGoPrev && setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          style={{ opacity: canGoPrev ? 1 : 0.3, padding: 6 }}
          disabled={!canGoPrev}
        >
          <AppIcon name="chevronLeft" size={20} color={colors.textJet} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="700" color={colors.textJet} align="center">
            {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </AppText>
        </View>
        <Pressable
          onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          style={{ padding: 6 }}
        >
          <AppIcon name="chevronRight" size={20} color={colors.textJet} />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="bodySmallest" weight="600" color={colors.textSlate}>
              {w}
            </AppText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {grid.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
            const disabled = startOfDay(day) < minDay;
            const isSelected = sameDay(day, selected);
            return (
              <View key={di} style={{ flex: 1, aspectRatio: 1, padding: 2 }}>
                <Pressable
                  onPress={() => !disabled && pickDay(day)}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <AppText
                    variant="bodySmall"
                    weight={isSelected ? '700' : '500'}
                    color={isSelected ? colors.textWhite : colors.textJet}
                  >
                    {String(day.getDate())}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      {/* Time */}
      <View style={{ height: 16 }} />
      <AppText variant="bodySmall" weight="600" color={colors.textMuted} align="left">
        Time
      </AppText>
      <View style={{ height: 8 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TimeWheel
          label="Hour"
          values={hours()}
          selected={selected.getHours()}
          format={(h) => String(h).padStart(2, '0')}
          onSelect={pickHour}
          min={min}
          selectedDate={selected}
          unit="hour"
        />
        <TimeWheel
          label="Min"
          values={MINUTE_STEPS}
          selected={nearestStep(selected.getMinutes())}
          format={(m) => String(m).padStart(2, '0')}
          onSelect={pickMinute}
          min={min}
          selectedDate={selected}
          unit="minute"
        />
      </View>

      <View style={{ height: 20 }} />
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: colors.surfaceDark }}>
        <AppText variant="bodySmall" weight="600" color={colors.primary} align="center">
          {formatSummary(selected)}
        </AppText>
      </View>

      <View style={{ height: 14 }} />
      <AppButton label={confirmLabel} expanded radius={100} onPress={() => onConfirm(selected)} />
    </View>
  );
}

function TimeWheel({
  values,
  selected,
  format,
  onSelect,
  min,
  selectedDate,
  unit,
}: {
  label: string;
  values: number[];
  selected: number;
  format: (v: number) => string;
  onSelect: (v: number) => void;
  min: Date;
  selectedDate: Date;
  unit: 'hour' | 'minute';
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {values.map((v) => {
          const candidate =
            unit === 'hour'
              ? new Date(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth(),
                  selectedDate.getDate(),
                  v,
                  selectedDate.getMinutes(),
                )
              : new Date(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth(),
                  selectedDate.getDate(),
                  selectedDate.getHours(),
                  v,
                );
          const disabled = candidate < min;
          const isActive = v === selected;
          return (
            <Pressable
              key={v}
              onPress={() => !disabled && onSelect(v)}
              disabled={disabled}
              style={{
                minWidth: 40,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: isActive ? colors.primary : colors.surfaceLight,
                opacity: disabled ? 0.3 : 1,
              }}
            >
              <AppText
                variant="bodySmall"
                weight={isActive ? '700' : '500'}
                color={isActive ? colors.textWhite : colors.textJet}
              >
                {format(v)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function buildMonthGrid(month: Date): (Date | null)[][] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function hours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

function nearestStep(minute: number): number {
  return MINUTE_STEPS.reduce(
    (prev, curr) => (Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev),
    0,
  );
}

function clampToMin(date: Date, min: Date): Date {
  return date < min ? new Date(min) : date;
}

function formatSummary(d: Date): string {
  const day = d.getDate();
  const month = MONTHS[d.getMonth()]!.slice(0, 3);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${d.getFullYear()}  ·  ${hh}:${mm}`;
}

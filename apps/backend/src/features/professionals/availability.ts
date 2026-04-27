import type { AvailabilityConfig } from '@lib/config/platform-config.service.js';

import type { AvailabilityDay, AvailabilitySlot } from './professionals.types.js';

interface BuildSlotsInput {
  // The window is interpreted as midnight-to-midnight in `tz`. `fromDate` and
  // `toDateExclusive` carry the date components only (their UTC clock parts
  // are ignored).
  fromDate: Date;
  toDateExclusive: Date;
  config: AvailabilityConfig;
  tz: string;
  now: Date;
}

// Pure function: emits the slot grid for [fromDate, toDateExclusive) where the
// boundaries and slot wall-clock hours are interpreted in `tz`. Slot start
// instants are emitted in UTC. Day labels (`days[].date`) reflect `tz`. Slots
// before `now + no_instant_booking_minutes` are marked unavailable. Conflict-
// with-existing-bookings filtering layers on once §8 ships.
export const buildSlotGrid = ({
  fromDate,
  toDateExclusive,
  config,
  tz,
  now,
}: BuildSlotsInput): AvailabilityDay[] => {
  const days: AvailabilityDay[] = [];
  const minBookableAt = new Date(now.getTime() + config.no_instant_booking_minutes * 60_000);

  let year = fromDate.getUTCFullYear();
  let month = fromDate.getUTCMonth();
  let day = fromDate.getUTCDate();
  const endYear = toDateExclusive.getUTCFullYear();
  const endMonth = toDateExclusive.getUTCMonth();
  const endDay = toDateExclusive.getUTCDate();

  while (compareYMD(year, month, day, endYear, endMonth, endDay) < 0) {
    const dateStr = formatYMD(year, month, day);
    const slots: AvailabilitySlot[] = [];

    const windowStartMinutes = config.daily_start_hour * 60;
    const windowEndMinutes = config.daily_end_hour * 60;

    for (
      let m = windowStartMinutes;
      m + config.slot_minutes <= windowEndMinutes;
      m += config.slot_minutes
    ) {
      const slotInstant = wallClockInTzToUtc(year, month, day, m, tz);
      slots.push({
        start_at: slotInstant.toISOString(),
        available: slotInstant >= minBookableAt,
      });
    }

    days.push({ date: dateStr, slots });
    [year, month, day] = addDay(year, month, day);
  }

  return days;
};

// Returns the IANA timezone's offset from UTC (in minutes) for a given instant.
// Uses Intl so DST is honored where applicable. Africa/Lagos is fixed UTC+1.
const ianaOffsetMinutes = (tz: string, at: Date): number => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart) return 0;
  // shortOffset is like "GMT+1", "GMT-05:30", "GMT".
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tzPart.value);
  if (!m) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  const hours = Number(m[2]);
  const minutes = m[3] !== undefined ? Number(m[3]) : 0;
  return sign * (hours * 60 + minutes);
};

// Given a wall-clock (year, month, day, minuteOfDay) in `tz`, returns the
// corresponding UTC instant. Solves the ambiguity by sampling the offset at the
// candidate UTC instant — DST transitions can cause off-by-one-hour errors at
// the exact 1-2 hours/year overlap, but we re-solve via a second iteration.
const wallClockInTzToUtc = (
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  tz: string,
): Date => {
  // First guess: assume UTC offset is what it would be for this instant in UTC.
  const utcGuess = Date.UTC(year, month, day, 0, 0, 0) + minuteOfDay * 60_000;
  const offset1 = ianaOffsetMinutes(tz, new Date(utcGuess));
  const utc1 = utcGuess - offset1 * 60_000;
  const offset2 = ianaOffsetMinutes(tz, new Date(utc1));
  if (offset2 === offset1) return new Date(utc1);
  return new Date(utcGuess - offset2 * 60_000);
};

const compareYMD = (
  ay: number,
  am: number,
  ad: number,
  by: number,
  bm: number,
  bd: number,
): number => {
  if (ay !== by) return ay - by;
  if (am !== bm) return am - bm;
  return ad - bd;
};

const addDay = (y: number, m: number, d: number): [number, number, number] => {
  const next = new Date(Date.UTC(y, m, d + 1));
  return [next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()];
};

const formatYMD = (y: number, m: number, d: number): string => {
  const yy = String(y).padStart(4, '0');
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const validateIanaTz = (tz: string): boolean => {
  try {
    // Throws RangeError on unknown zone.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

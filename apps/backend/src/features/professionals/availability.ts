import type { AvailabilityConfig } from '@lib/config/platform-config.service.js';

import type { AvailabilityDay, AvailabilitySlot } from './professionals.types.js';

export interface BookingInterval {
  start: Date;
  end: Date;
}

/**
 * A pro's recurring "do-not-book" window expressed as minute-of-day in
 * the request's `tz`. `endMinute` is exclusive. A slot at wall-clock
 * `m` (with duration D minutes) overlaps the block when
 * `m < endMinute AND m + D > startMinute`.
 */
export interface BookingBlockMinutes {
  startMinute: number;
  endMinute: number;
}

interface BuildSlotsInput {
  // The window is interpreted as midnight-to-midnight in `tz`. `fromDate` and
  // `toDateExclusive` carry the date components only (their UTC clock parts
  // are ignored).
  fromDate: Date;
  toDateExclusive: Date;
  config: AvailabilityConfig;
  tz: string;
  now: Date;
  // Live pending/confirmed bookings on the callee that overlap the window.
  // Slots that intersect any of these are marked unavailable.
  bookings?: BookingInterval[];
  // Pro-declared recurring time-of-day exclusions. Same merge semantics as
  // bookings — any slot whose wall-clock duration intersects a block is
  // marked unavailable. Empty array (or omitted) means no exclusions.
  blocks?: BookingBlockMinutes[];
  // The duration the caller intends to book. A slot at `slot_start` is
  // available only if `[slot_start, slot_start + bookingDurationMinutes)`
  // (a) fits inside the daily window and (b) doesn't overlap any booking.
  // Defaults to `config.slot_minutes` (existing behavior).
  bookingDurationMinutes?: number;
}

// Pure function: emits the slot grid for [fromDate, toDateExclusive) where the
// boundaries and slot wall-clock hours are interpreted in `tz`. Slot start
// instants are emitted in UTC. Day labels (`days[].date`) reflect `tz`. A slot
// is unavailable if any of these holds:
//   - slot_start < now + no_instant_booking_minutes (too soon)
//   - slot_start + bookingDuration extends past the daily window end (won't fit)
//   - [slot_start, slot_start + bookingDuration) overlaps a live booking
export const buildSlotGrid = ({
  fromDate,
  toDateExclusive,
  config,
  tz,
  now,
  bookings = [],
  blocks = [],
  bookingDurationMinutes,
}: BuildSlotsInput): AvailabilityDay[] => {
  const days: AvailabilityDay[] = [];
  const minBookableAt = new Date(now.getTime() + config.no_instant_booking_minutes * 60_000);
  const durationMinutes = bookingDurationMinutes ?? config.slot_minutes;

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
      const slotStart = wallClockInTzToUtc(year, month, day, m, tz);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      // The booking must fit in the daily window — check the END time against
      // the daily end (separate from the slot cadence loop, which uses
      // slot_minutes for stepping).
      const dayEnd = wallClockInTzToUtc(year, month, day, windowEndMinutes, tz);
      const fitsInWindow = slotEnd <= dayEnd;

      const overlapsBooking = bookings.some((b) => slotStart < b.end && slotEnd > b.start);

      // Pro-declared exclusion: compare in wall-clock minutes within the
      // current day. The booking's wall-clock range is [m, m + duration).
      const slotEndMinute = m + durationMinutes;
      const overlapsBlock = blocks.some(
        (block) => m < block.endMinute && slotEndMinute > block.startMinute,
      );

      const available =
        slotStart >= minBookableAt && fitsInWindow && !overlapsBooking && !overlapsBlock;

      slots.push({
        start_at: slotStart.toISOString(),
        available,
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

/**
 * Given a UTC instant + IANA tz, returns the wall-clock minute-of-day in
 * that tz. Used to evaluate whether a booking attempt at a specific UTC
 * instant falls inside a pro's recurring block (`{startMinute, endMinute}`).
 *
 * Example: 2026-05-10T12:00:00Z in Africa/Lagos (UTC+1) → 13*60 = 780.
 */
export const wallClockMinuteInTz = (instant: Date, tz: string): number => {
  const offsetMin = ianaOffsetMinutes(tz, instant);
  const local = new Date(instant.getTime() + offsetMin * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
};

/**
 * True when the booking interval `[startAt, startAt + durationMinutes)`
 * intersects any of [blocks] interpreted in the given IANA tz. Same
 * algorithm `buildSlotGrid` uses, exposed for the booking-create guard.
 *
 * Blocks are recurring (every day), so an interval that crosses midnight
 * is checked as two halves; in v1 the schema rejects cross-midnight
 * blocks so we only need to walk forward minute-of-day until we exceed
 * 1440 minutes.
 */
export const bookingHitsBlock = (
  startAt: Date,
  durationMinutes: number,
  blocks: ReadonlyArray<BookingBlockMinutes>,
  tz: string,
): boolean => {
  if (blocks.length === 0) return false;
  const startMinute = wallClockMinuteInTz(startAt, tz);
  // Booking duration walks forward in wall-clock minutes. If the booking
  // crosses midnight, the second half wraps into the next day's 0..N
  // range; check both halves.
  const total = startMinute + durationMinutes;
  if (total <= 1440) {
    return blocks.some((b) => startMinute < b.endMinute && total > b.startMinute);
  }
  const firstEnd = 1440;
  const secondEnd = total - 1440;
  return blocks.some(
    (b) =>
      (startMinute < b.endMinute && firstEnd > b.startMinute) ||
      (0 < b.endMinute && secondEnd > b.startMinute),
  );
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

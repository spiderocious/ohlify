import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './booking-blocks.repo.js';
import * as profileRepo from './profile.repo.js';
import type { PutBookingBlocksDto } from './profile.schema.js';

interface BookingBlockView {
  start_minute: number;
  end_minute: number;
}

/**
 * Sort + merge overlapping/adjacent intervals so the persisted list is
 * canonical. Two blocks `5–7pm` and `6–8pm` collapse to a single `5–8pm`;
 * `13:00–14:00` and `14:00–15:00` collapse to `13:00–15:00`. Keeps the
 * stored list minimal and avoids surprising the user when their UI
 * re-fetches and rows have been merged.
 */
const normalize = (
  raw: ReadonlyArray<BookingBlockView>,
): BookingBlockView[] => {
  if (raw.length === 0) return [];
  const sorted = [...raw].sort((a, b) =>
    a.start_minute === b.start_minute
      ? a.end_minute - b.end_minute
      : a.start_minute - b.start_minute,
  );
  const merged: BookingBlockView[] = [];
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && block.start_minute <= last.end_minute) {
      // Overlap or touch → extend the running interval.
      if (block.end_minute > last.end_minute) {
        last.end_minute = block.end_minute;
      }
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
};

const toView = (
  row: Pick<repo.BookingBlockRow, 'start_minute' | 'end_minute'>,
): BookingBlockView => ({
  start_minute: row.start_minute,
  end_minute: row.end_minute,
});

export const list = async (userId: string) => {
  const rows = await repo.listForUser(userId);
  return new ServiceSuccess(
    { blocks: rows.map(toView) },
    MESSAGE_KEYS.BOOKING_BLOCKS_FETCHED,
  );
};

export const replace = async (dto: PutBookingBlocksDto, userId: string) => {
  const user = await profileRepo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', MESSAGE_KEYS.BOOKING_BLOCKS_UPDATED, 401);
  }
  // Booking blocks only have meaning for professionals — clients can't
  // be booked, so blocks would never apply. Keep the surface tight.
  if (user.role !== 'professional') {
    return new ServiceError('role_mismatch', MESSAGE_KEYS.BOOKING_BLOCKS_UPDATED, 403);
  }

  const normalized = normalize(dto.blocks);
  const rows = await repo.replaceAll(userId, normalized);
  return new ServiceSuccess(
    { blocks: rows.map(toView) },
    MESSAGE_KEYS.BOOKING_BLOCKS_UPDATED,
  );
};

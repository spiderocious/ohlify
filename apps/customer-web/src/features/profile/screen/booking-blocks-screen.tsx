import { IconClock, IconDelete, IconEdit, IconPlus } from '@icons';

import { AppButton, AppLoader, AppText, DrawerService } from '@ohlify/ui';
import type { BookingBlock } from '@ohlify/api';

import { useBookingBlocks } from '../api/use-booking-blocks.js';
import { useUpdateBookingBlocks } from '../api/use-update-booking-blocks.js';
import {
  formatRange,
  type BookingBlockDraft,
} from '../lib/booking-blocks-format.js';

import { BookingBlockModal } from './parts/booking-block-modal.js';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

/**
 * Pro-only screen for declaring recurring time-of-day windows the user
 * doesn't want to be booked. Saves are full-list overwrites — every
 * Add/Edit/Delete posts the entire list back to the server.
 */
export function BookingBlocksScreen() {
  const { data, isLoading } = useBookingBlocks();
  const updateBlocks = useUpdateBookingBlocks();
  const blocks = data?.blocks ?? [];

  const persist = (next: BookingBlock[], successMessage: string) => {
    updateBlocks.mutate(next, {
      onSuccess: () => DrawerService.toast(successMessage, { type: 'success' }),
      onError: () =>
        DrawerService.toast('Could not save your blocks. Try again.', { type: 'error' }),
    });
  };

  const openModal = (initial: BookingBlock | null, originalIndex: number | null) => {
    let pending: BookingBlockDraft | undefined;
    let close: (() => void) | null = null;
    const handle = DrawerService.showCustomModal(
      initial ? 'Edit block' : 'Add block',
      (dismiss) => {
        close = dismiss;
        return (
          <BookingBlockModal
            initial={initial}
            onSubmit={(draft) => {
              pending = draft;
              close?.();
            }}
          />
        );
      },
      { position: 'center' },
    );
    void handle.onDismissed.then(() => {
      if (!pending) return;
      const next: BookingBlock[] = [...blocks];
      if (originalIndex === null) {
        next.push(pending);
      } else {
        next[originalIndex] = pending;
      }
      persist(next, initial ? 'Block updated' : 'Block added');
    });
  };

  const removeBlock = (index: number) => {
    let confirmed = false;
    const handle = DrawerService.showConfirmationModal(
      'Delete block?',
      'This window will become bookable again.',
      {
        kind: 'warning',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        onConfirm: () => {
          confirmed = true;
        },
      },
    );
    void handle.onDismissed.then(() => {
      if (!confirmed) return;
      const next = blocks.filter((_, i) => i !== index);
      persist(next, 'Block removed');
    });
  };

  return (
    <ProfileSubscreenScaffold title="Booking blocks">
      <div className="flex flex-col gap-3">
        <AppText variant="body" align="start" className="text-text-muted">
          Times you don&apos;t want to be booked. Applied every day.
        </AppText>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <AppLoader />
          </div>
        ) : blocks.length === 0 ? (
          <div className="rounded-2xl bg-background px-4 py-6">
            <AppText variant="bodyTitle" weight={700} align="start">
              No blocks yet
            </AppText>
            <AppText
              variant="bodySmall"
              align="start"
              className="mt-1 text-text-muted"
            >
              Add a block to keep that time off your booking calendar.
            </AppText>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-background">
            {blocks.map((block, index) => (
              <div
                key={`${block.start_minute}-${block.end_minute}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-dark text-primary">
                  <IconClock size={18} />
                </span>
                <AppText
                  variant="body"
                  weight={600}
                  align="start"
                  color="var(--ohl-text-jet)"
                  className="flex-1"
                >
                  {formatRange(block.start_minute, block.end_minute)}
                </AppText>
                <button
                  type="button"
                  onClick={() => openModal(block, index)}
                  aria-label="Edit block"
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-dark text-text-muted hover:text-text-primary"
                >
                  <IconEdit size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(index)}
                  aria-label="Delete block"
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-dark text-danger"
                >
                  <IconDelete size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <AppButton
          label="Add block"
          variant="outline"
          startIcon={<IconPlus size={16} />}
          expanded
          radius={100}
          isLoading={updateBlocks.isPending}
          onPressed={() => openModal(null, null)}
        />
      </div>
    </ProfileSubscreenScaffold>
  );
}

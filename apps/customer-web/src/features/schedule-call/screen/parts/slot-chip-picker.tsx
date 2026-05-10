import { Repeat, Show } from 'meemaw';

import { AppEmptyState, AppLoader, AppText } from '@ohlify/ui';

export interface SlotOption {
  /** ISO instant returned by the backend, in UTC. */
  startAt: string;
  /** Local "HH:MM" label rendered on the chip. */
  label: string;
}

interface SlotChipPickerProps {
  slots: ReadonlyArray<SlotOption>;
  selectedStartAt?: string;
  onSelect: (slot: SlotOption) => void;
  isLoading?: boolean;
  hasDate: boolean;
}

export function SlotChipPicker({
  slots,
  selectedStartAt,
  onSelect,
  isLoading,
  hasDate,
}: SlotChipPickerProps) {
  if (!hasDate) {
    return (
      <div className="rounded-2xl bg-surface-light p-4">
        <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)">
          Pick a date to see available slots.
        </AppText>
      </div>
    );
  }

  // Loading: show a clearly-labelled placeholder so the user knows the times
  // are being fetched. The previous version had a silent spinner that was
  // easy to miss — especially during a duration change where the chip area
  // would just blink. We render a tall block with a label alongside the
  // spinner; same shape regardless of whether this is a first-time fetch
  // or a refetch after the user changed duration.
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-light"
      >
        <AppLoader size={22} />
        <AppText variant="bodyNormal" align="center" color="var(--ohl-text-muted)">
          Looking up available times…
        </AppText>
      </div>
    );
  }

  return (
    <Show
      when={slots.length > 0}
      fallback={
        <AppEmptyState message="No slots available on this date — try another." />
      }
    >
      <div className="flex flex-wrap gap-2">
        <Repeat each={slots as SlotOption[]}>
          {(s) => {
            const isSel = s.startAt === selectedStartAt;
            return (
              <button
                key={s.startAt}
                type="button"
                onClick={() => onSelect(s)}
                className="rounded-pill border px-4 py-2 transition"
                style={{
                  backgroundColor: isSel ? 'var(--ohl-primary)' : 'var(--ohl-background)',
                  borderColor: isSel ? 'var(--ohl-primary)' : 'var(--ohl-border)',
                  color: isSel ? '#fff' : 'var(--ohl-text-jet)',
                }}
              >
                <span className="font-sans text-sm font-semibold">{s.label}</span>
              </button>
            );
          }}
        </Repeat>
      </div>
    </Show>
  );
}

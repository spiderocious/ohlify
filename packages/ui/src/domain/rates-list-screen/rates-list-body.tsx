import { Show } from 'meemaw';

import type { CallRate, CallType } from '@ohlify/core';

import { IconPlus } from '@icons';

import { DrawerService } from '../../modals/drawer-service.js';
import { AppButton } from '../../primitives/app-button/app-button.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AddRateForm } from '../add-rate-form/add-rate-form.js';
import { RatesGroup } from '../rates-group/rates-group.js';

/** Caller-supplied bounds for the add-rate form. All optional — see `AddRateForm` for fallbacks. */
export interface RateConstraints {
  callTypes?: readonly CallType[];
  durations?: readonly number[];
  minKobo?: number;
  maxKobo?: number;
}

export interface RatesController {
  rates: ReadonlyArray<CallRate>;
  addRate: (rate: Omit<CallRate, 'id'> & { id: string }) => void;
  removeRate: (id: string) => void;
  /**
   * Optional. When provided, the "Add rate" form pulls its dropdown options +
   * price bounds from here instead of using built-in defaults. Customer-web
   * supplies values from `rates.*` public config.
   */
  constraints?: RateConstraints;
}

interface RatesListBodyProps {
  controller: RatesController;
}

/**
 * The interior of the rates editor — the empty state, the audio/video groups,
 * and the "Add rate" button. Used by both the full-screen `RatesListScreen`
 * and the in-modal `RatesListContent`.
 */
export function RatesListBody({ controller }: RatesListBodyProps) {
  const audio = controller.rates.filter((r) => r.callType === 'audio');
  const video = controller.rates.filter((r) => r.callType === 'video');
  const hasRates = controller.rates.length > 0;

  const openAdd = () => {
    let pending: ReturnType<typeof toRate> | null = null;
    const c = controller.constraints;
    const handle = DrawerService.showCustomModal(
      'Add rate',
      (dismiss) => (
        <AddRateForm
          onSave={(rate) => {
            pending = toRate(rate);
            dismiss();
          }}
          {...(c?.callTypes ? { callTypes: c.callTypes } : {})}
          {...(c?.durations ? { durations: c.durations } : {})}
          {...(c?.minKobo !== undefined ? { minKobo: c.minKobo } : {})}
          {...(c?.maxKobo !== undefined ? { maxKobo: c.maxKobo } : {})}
        />
      ),
      { position: 'bottom' },
    );
    // Toasts (success + error) are owned by the controller's `addRate` — see
    // rates-modal-content.tsx in customer-web. Firing one here too would
    // produce a duplicate "added" toast on failure paths.
    void handle.onDismissed.then(() => {
      if (!pending) return;
      controller.addRate(pending);
    });
  };

  const confirmDelete = (rate: CallRate) => {
    DrawerService.showConfirmationModal(
      'Delete rate?',
      'Deleting rate would mean that no one would be able to see the rate on your profile.',
      {
        kind: 'error',
        destructive: true,
        confirmButtonText: 'Confirm and delete',
        cancelButtonText: 'Cancel',
        onConfirm: () => {
          // Same as openAdd: success/error toasts are owned by the controller.
          controller.removeRate(rate.id);
        },
      },
    );
  };

  return (
    <Show
      when={hasRates}
      fallback={
        <div className="rounded-md bg-surface-light p-6 text-center">
          <AppText variant="medium" align="center" weight={600} color="var(--ohl-text-jet)">
            No rates yet
          </AppText>
          <div className="mt-1">
            <AppText variant="body" align="center" color="var(--ohl-text-muted)">
              Add your first rate to let clients book a call with you.
            </AppText>
          </div>
          <div className="mt-4 flex justify-center">
            <AppButton
              label="Add rate"
              startIcon={<IconPlus size={18} color="#fff" />}
              radius={100}
              onPressed={openAdd}
            />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Show when={audio.length > 0}>
          <RatesGroup callType="audio" rates={audio} onDelete={confirmDelete} />
        </Show>
        <Show when={video.length > 0}>
          <RatesGroup callType="video" rates={video} onDelete={confirmDelete} />
        </Show>
        <AppButton
          label="Add rate"
          variant="plain"
          startIcon={<IconPlus size={18} color="var(--ohl-primary)" />}
          expanded
          radius={100}
          onPressed={openAdd}
        />
      </div>
    </Show>
  );
}

function toRate(input: Omit<CallRate, 'id'> & { id: string }): CallRate {
  return {
    ...input,
    id: input.id || `rate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

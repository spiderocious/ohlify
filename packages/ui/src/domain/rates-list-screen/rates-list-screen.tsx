import { IconChevronLeft, IconPlus } from '@icons';
import { Show } from 'meemaw';

import type { CallRate } from '@ohlify/core';

import { DrawerService } from '../../modals/drawer-service.js';
import { AppButton } from '../../primitives/app-button/app-button.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AddRateForm } from '../add-rate-form/add-rate-form.js';
import { RatesGroup } from '../rates-group/rates-group.js';

/** Subset a notifier needs to expose to power this screen. */
export interface RatesController {
  rates: ReadonlyArray<CallRate>;
  addRate: (rate: Omit<CallRate, 'id'> & { id: string }) => void;
  removeRate: (id: string) => void;
}

interface RatesListScreenProps {
  controller: RatesController;
  /** Called when user taps the back row. Defaults to history.back(). */
  onBack?: () => void;
  submitLabel?: string;
  /** Defaults to onBack. */
  onSubmit?: () => void;
}

/**
 * Reusable Rates list screen.
 * 1:1 with mobile/lib/ui/widgets/rates_list_screen/rates_list_screen.dart.
 */
export function RatesListScreen({
  controller,
  onBack,
  submitLabel = 'Proceed',
  onSubmit,
}: RatesListScreenProps) {
  const audio = controller.rates.filter((r) => r.callType === 'audio');
  const video = controller.rates.filter((r) => r.callType === 'video');
  const hasRates = controller.rates.length > 0;

  const back = onBack ?? (() => window.history.back());
  const submit = onSubmit ?? back;

  const openAdd = () => {
    let pending: ReturnType<typeof toRate> | null = null;
    const handle = DrawerService.showCustomModal(
      'Add rate',
      (dismiss) => (
        <AddRateForm
          onSave={(rate) => {
            pending = toRate(rate);
            dismiss();
          }}
        />
      ),
      { position: 'bottom' },
    );
    handle.onDismissed.then(() => {
      if (!pending) return;
      controller.addRate(pending);
      DrawerService.toast('Rate added successfully', { type: 'success' });
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
          controller.removeRate(rate.id);
          DrawerService.toast('Rate deleted successfully', { type: 'success' });
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col bg-background font-sans">
      <div className="px-4 pb-1 pt-2">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1 text-text-jet"
        >
          <IconChevronLeft size={22} />
          <AppText variant="body" align="start" color="var(--ohl-text-jet)" weight={500}>
            Back
          </AppText>
        </button>
      </div>
      <div className="px-4 pb-1 pt-2">
        <AppText variant="title" align="start" color="var(--ohl-text-jet)" weight={800}>
          Rates
        </AppText>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
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
      </div>
      <div className="px-4 pb-4 pt-2">
        <AppButton
          label={submitLabel}
          expanded
          radius={100}
          isDisabled={!hasRates}
          onPressed={!hasRates ? undefined : submit}
        />
      </div>
    </div>
  );
}

function toRate(input: Omit<CallRate, 'id'> & { id: string }): CallRate {
  return {
    ...input,
    id: input.id || `rate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

import { IconBack } from '@icons';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import {
  AppButton,
  AppErrorState,
  AppIconButton,
  AppLoader,
  AppText,
  DrawerService,
  KycProgressHeader,
} from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { useCompleteKyc } from '../api/use-complete-kyc.js';
import { useKycSpec } from '../api/use-kyc-spec.js';
import { KycItemsList } from './parts/kyc-items-list.js';

export function ProfessionalKycScreen() {
  const navigate = useNavigate();
  const completeKyc = useCompleteKyc();
  const { data: spec, isLoading, isError } = useKycSpec();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light">
        <AppLoader />
      </main>
    );
  }

  if (isError || !spec) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light">
        <AppErrorState message="Could not load KYC items." />
      </main>
    );
  }

  const handleProceed = () => {
    completeKyc.mutate(undefined, {
      onSuccess: () => navigate(ROUTES.HOME.absPath, { replace: true }),
      onError: (err) => {
        const e = err as unknown as ApiError;
        if (e.reason === 'kyc_incomplete') {
          const missing = (e.fieldErrors?.['incomplete_items'] ?? []).join(', ');
          DrawerService.toast(
            missing ? `Still incomplete: ${missing}` : 'Some items are still missing.',
            { type: 'error' },
          );
        } else if (e.reason === 'resubmit_unchanged') {
          const stale = (e.fieldErrors?.['item_keys'] ?? []).join(', ');
          DrawerService.toast(
            stale
              ? `Update ${stale} before resubmitting.`
              : 'Update the flagged items before resubmitting.',
            { type: 'error' },
          );
        } else {
          DrawerService.toast('Could not complete KYC. Please try again.', { type: 'error' });
        }
      },
    });
  };

  const visibleItems = spec.items.filter((i) => i.enabled);
  // When the user is in a partial-rejection state, scope progress + the
  // Proceed gate to ONLY the items the admin flagged. Items outside the
  // set are locked and shouldn't pull the progress bar back to "10/12".
  const resubmitKeys = spec.resubmission?.item_keys ?? null;
  const acknowledgedKeys = spec.resubmission?.acknowledged_keys ?? null;
  const scopedItems =
    resubmitKeys && resubmitKeys.length > 0
      ? visibleItems.filter((i) => resubmitKeys.includes(i.key))
      : visibleItems;
  const requiredItems = scopedItems.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.complete).length;
  // For partial resubmits the user must actually touch every flagged
  // key — `acknowledged_keys` reflects what the server has registered as
  // patched since the rejection. `bank_account` and `rates` count
  // automatically when the data exists (server treats them as passive).
  const PASSIVELY_ACKNOWLEDGED = new Set(['bank_account', 'rates']);
  const dirtyResubmitOk =
    resubmitKeys === null || resubmitKeys.length === 0
      ? true
      : resubmitKeys.every((k) => {
          if (acknowledgedKeys?.includes(k)) return true;
          if (PASSIVELY_ACKNOWLEDGED.has(k)) {
            const item = visibleItems.find((i) => i.key === k);
            return item?.complete === true;
          }
          return false;
        });
  const allRequiredComplete =
    requiredItems.length > 0 && completedRequired === requiredItems.length;
  const canProceed = allRequiredComplete && dirtyResubmitOk;

  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="flex items-center gap-3 px-4 py-2">
        <AppIconButton
          icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
          variant="ghost"
          backgroundColor="var(--ohl-background)"
          size={44}
          onPressed={() => navigate(-1)}
          ariaLabel="Back"
        />
        <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
          Become a Professional
        </AppText>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-4 pb-6 lg:max-w-2xl">
          <KycProgressHeader
            completed={completedRequired}
            total={requiredItems.length}
            percent={
              requiredItems.length === 0
                ? 0
                : Math.round((completedRequired / requiredItems.length) * 100)
            }
          />
          <div className="mt-5">
            <AppText variant="body" align="start" color="var(--ohl-text-muted)">
              {resubmitKeys && resubmitKeys.length > 0 ? 'Items to update' : 'Setup steps'}
            </AppText>
          </div>
          <div className="mt-2.5">
            <KycItemsList items={visibleItems} resubmitKeys={resubmitKeys} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-4 pb-4 pt-2 lg:max-w-2xl">
        <AppButton
          label={resubmitKeys && resubmitKeys.length > 0 ? 'Resubmit for review' : 'Proceed'}
          expanded
          radius={100}
          isDisabled={!canProceed || completeKyc.isPending}
          onPressed={canProceed ? handleProceed : undefined}
        />
      </div>
    </main>
  );
}

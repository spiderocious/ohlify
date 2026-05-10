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
        if (e.code === 'kyc_incomplete') {
          const missing = (e.field_errors?.['incomplete_items'] ?? []).join(', ');
          DrawerService.toast(
            missing ? `Still incomplete: ${missing}` : 'Some items are still missing.',
            { type: 'error' },
          );
        } else {
          DrawerService.toast('Could not complete KYC. Please try again.', { type: 'error' });
        }
      },
    });
  };

  const visibleItems = spec.items.filter((i) => i.enabled);
  const requiredItems = visibleItems.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.complete).length;

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
            percent={spec.total_required === 0 ? 0 : Math.round((completedRequired / requiredItems.length) * 100)}
          />
          <div className="mt-5">
            <AppText variant="body" align="start" color="var(--ohl-text-muted)">
              Setup steps
            </AppText>
          </div>
          <div className="mt-2.5">
            <KycItemsList items={visibleItems} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-4 pb-4 pt-2 lg:max-w-2xl">
        <AppButton
          label="Proceed"
          expanded
          radius={100}
          isDisabled={!spec.all_complete || completeKyc.isPending}
          onPressed={spec.all_complete ? handleProceed : undefined}
        />
      </div>
    </main>
  );
}

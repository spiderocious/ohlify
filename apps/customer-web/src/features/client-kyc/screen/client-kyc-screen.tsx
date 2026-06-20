import { IconBack } from '@icons';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppIconButton, AppText, KycProgressHeader } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import {
  CLIENT_KYC_ITEMS,
  ClientKycProvider,
  useClientKyc,
} from '../providers/client-kyc-provider.js';
import { ClientKycItemsList } from './parts/client-kyc-items-list.js';
import { useCompleteKyc } from '../../professional-kyc/api/use-complete-kyc.js';
import { useKycSpec } from '../../professional-kyc/api/use-kyc-spec.js';

export function ClientKycScreen() {
  return (
    <ClientKycProvider>
      <ClientKycScreenContent />
    </ClientKycProvider>
  );
}

function ClientKycScreenContent() {
  const navigate = useNavigate();
  const ctx = useClientKyc();
  const completeKyc = useCompleteKyc();
  // Hit the spec endpoint just for the `resubmission` block. Client-KYC
  // values are local state in the provider; we don't need the spec items
  // themselves, only the partial-rejection scope.
  const { data: spec } = useKycSpec();
  const resubmitKeys = spec?.resubmission?.item_keys ?? null;
  const acknowledgedKeys = spec?.resubmission?.acknowledged_keys ?? null;
  const isPartial = resubmitKeys !== null && resubmitKeys.length > 0;
  // Same dirty-resubmit gate as the pro screen — every flagged key must
  // be acknowledged on the server before we let the user submit.
  const dirtyResubmitOk = !isPartial
    ? true
    : (resubmitKeys ?? []).every((k) => acknowledgedKeys?.includes(k) ?? false);
  const allDone = ctx.completedCount === CLIENT_KYC_ITEMS.length && dirtyResubmitOk;

  const handleProceed = () => {
    completeKyc.mutate(undefined, {
      onSuccess: () => navigate(ROUTES.HOME.absPath, { replace: true }),
      onError: (err) => {
        const apiErr = err as unknown as ApiError;
        if (apiErr.reason === 'kyc_incomplete') {
          // progress bar will reflect missing items — no toast needed
        }
      },
    });
  };

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
          Set up your profile
        </AppText>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-4 pb-6 lg:max-w-2xl">
          <KycProgressHeader
            completed={ctx.completedCount}
            total={CLIENT_KYC_ITEMS.length}
            percent={ctx.completionPercent}
          />
          <div className="mt-5">
            <AppText variant="body" align="start" color="var(--ohl-text-muted)">
              {isPartial ? 'Items to update' : 'Setup steps'}
            </AppText>
          </div>
          <div className="mt-2.5">
            <ClientKycItemsList resubmitKeys={resubmitKeys} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-4 pb-4 pt-2 lg:max-w-2xl">
        <AppButton
          label={isPartial ? 'Resubmit for review' : 'Proceed'}
          expanded
          radius={100}
          isDisabled={!allDone || completeKyc.isPending}
          onPressed={allDone ? handleProceed : undefined}
        />
      </div>
    </main>
  );
}

import { IconBriefcase, IconSearch } from '@icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES, roleLabel, type Role } from '@ohlify/core';
import { AppButton, AppText, DrawerService } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { RoleCard } from './parts/role-card.js';
import { useSelectRole } from '../api/use-select-role.js';

export function RoleSelectionScreen() {
  const navigate = useNavigate();
  const selectRole = useSelectRole();
  const [selected, setSelected] = useState<Role | null>(null);

  const onContinue = () => {
    if (!selected) return;
    let confirmed = false;
    const confirmation = DrawerService.showConfirmationModal(
      `Continue as ${roleLabel[selected]}?`,
      selected === 'professional'
        ? 'You will need to complete a short profile so clients can discover and book you.'
        : 'You will be able to browse and book professionals right away. You can switch later.',
      {
        kind: 'info',
        confirmButtonText: 'Yes, continue',
        cancelButtonText: 'Change',
        onConfirm: () => {
          confirmed = true;
        },
      },
    );

    void confirmation.onDismissed.then(() => {
      if (!confirmed) return;
      selectRole.mutate(
        { role: selected },
        {
          onSuccess: (data) => {
            DrawerService.showFeedbackModal(
              'Role saved successfully',
              selected === 'professional'
                ? "You are all set as a Professional. Let's complete your profile next."
                : 'You are all set as a Client. Find a professional and book a call whenever you are ready.',
              {
                kind: 'success',
                position: 'fullscreen',
                showCloseButton: false,
                dismissible: false,
                confirmButtonText: 'Complete my profile',
                onConfirm: () => {
                  const dest =
                    data.next_step === 'professional_kyc'
                      ? ROUTES.PROFESSIONAL_KYC.absPath
                      : ROUTES.CLIENT_KYC.absPath;
                  navigate(dest, { replace: true });
                },
              },
            );
          },
          onError: (err) => {
            const apiErr = err as unknown as ApiError;
            DrawerService.toast(
              apiErr.reason === 'rate_limited'
                ? 'Too many attempts. Please wait a moment.'
                : 'Something went wrong. Please try again.',
              { type: 'error' },
            );
          },
        },
      );
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-6 lg:max-w-2xl">
          <AppText as="h1" variant="title" weight={800} align="start" color="var(--ohl-text-jet)">
            How will you use Ohlify?
          </AppText>
          <div className="mt-1.5">
            <AppText variant="body" align="start" color="var(--ohl-text-muted)">
              Pick the option that fits best. You can change this later from your profile settings.
            </AppText>
          </div>

          <div className="mt-6 space-y-3.5">
            <RoleCard
              title="I'm a Client"
              subtitle="Find and book short paid calls with experts across any field."
              Icon={IconSearch}
              bullets={[
                'Browse verified professionals',
                'Book audio or video calls',
                'Pay per minute, no subscription',
              ]}
              selected={selected === 'client'}
              onTap={() => setSelected('client')}
            />
            <RoleCard
              title="I'm a Professional"
              subtitle="Get paid for your time. Let people book short calls with you."
              Icon={IconBriefcase}
              bullets={[
                'Set your own rates and availability',
                'Accept audio or video bookings',
                'Withdraw earnings to your bank',
              ]}
              selected={selected === 'professional'}
              onTap={() => setSelected('professional')}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-5 pb-4 pt-2 lg:max-w-2xl">
        <AppButton
          label="Continue"
          expanded
          radius={100}
          isDisabled={selected === null || selectRole.isPending}
          onPressed={selected ? onContinue : undefined}
        />
      </div>
    </main>
  );
}

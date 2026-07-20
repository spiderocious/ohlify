import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showConfirmationModal, showToast } from '@ohlify/mobile-ui';
import type { QueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../../../app.navigation';
import { profileApi } from '../api/profile-api';
import { runSensitiveActionFlow } from './otp-gate';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Two-step delete flow: destructive confirmation modal → sensitive-action
 * OTP gate → DELETE /me → clear session + bounce to onboarding. Mirrors
 * mobile/lib/features/profile/helpers/delete_account_flow.dart.
 */
export async function startDeleteAccountFlow(params: {
  navigation: RootNavigation;
  queryClient: QueryClient;
  logout: () => Promise<void>;
}): Promise<void> {
  let confirmed = false;
  const handle = showConfirmationModal(
    'Delete account?',
    'Your profile, rates, call history, and wallet balance will be permanently removed. This action cannot be undone.',
    {
      kind: 'error',
      destructive: true,
      confirmButtonText: 'Yes, delete my account',
      cancelButtonText: 'Keep account',
      onConfirm: () => {
        confirmed = true;
      },
    },
  );
  await handle.onDismissed;
  if (!confirmed) return;

  const ok = await runSensitiveActionFlow({
    action: 'delete_account',
    onSubmit: (otp) => profileApi.deleteAccount({ otp }),
  });
  if (!ok) return;

  showToast('Account deleted', { type: 'success' });
  await params.logout();
  params.queryClient.clear();
  params.navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
}

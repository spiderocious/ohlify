import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppAvatar, AppText, DrawerService } from '@ohlify/ui';
import { useMe } from '@ohlify/api';

import { useLogout } from '../api/use-logout.js';
import { useRequestDeleteAccountOtp } from '../api/use-delete-account.js';

import { ProfileLinkCard } from './parts/profile-link-card.js';
import { ProfileMenu } from './parts/profile-menu.js';

/** Mirrors mobile/lib/features/profile/screen/profile_screen.dart. */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const logout = useLogout();
  const requestDeleteOtp = useRequestDeleteAccountOtp();

  const profileUrl = me?.share_slug
    ? `www.ohlify.com/profile/${me.share_slug}`
    : 'www.ohlify.com/profile/';

  const confirmLogout = () => {
    let confirmed = false;
    const handle = DrawerService.showConfirmationModal(
      'Log out?',
      'You will need to sign in again to book or receive calls.',
      {
        kind: 'warning',
        confirmButtonText: 'Log out',
        cancelButtonText: 'Stay signed in',
        onConfirm: () => {
          confirmed = true;
        },
      },
    );
    void handle.onDismissed.then(() => {
      if (!confirmed) return;
      logout.mutate(undefined, {
        onSuccess: () => navigate(ROUTES.LOGIN.absPath, { replace: true }),
      });
    });
  };

  const startDeleteAccountFlow = () => {
    DrawerService.showFeedbackModal(
      'Account deletion is OTP-protected',
      `We will send a code to ${me?.email ?? 'your email'}. Enter it on the next screen to permanently delete your account.`,
      {
        kind: 'warning',
        confirmButtonText: 'Continue',
        onConfirm: () => {
          requestDeleteOtp.mutate(undefined);
        },
      },
    );
  };

  return (
    <div className="min-h-full bg-surface-light">
      <div className="mx-auto w-full max-w-3xl px-5 pb-10 pt-3 lg:max-w-5xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <AppText variant="title" weight={800} align="start" color="var(--ohl-text-jet)">
              Your Profile
            </AppText>
            <AppText
              variant="body"
              align="start"
              color="var(--ohl-text-muted)"
              className="mt-0.5"
              maxLines={1}
            >
              {me?.full_name ?? ''}
            </AppText>
          </div>
          <AppAvatar fileKey={me?.avatar_url} size={52} radius={8} alt="avatar" />

        </div>

        <div className="mt-5">
          <ProfileLinkCard profileUrl={profileUrl} />
        </div>

        <div className="mt-7">
          <ProfileMenu
            onPersonalInfo={() => navigate(ROUTES.PROFILE.PERSONAL_INFO.absPath)}
            onRates={() => navigate(ROUTES.PROFILE.RATES.absPath)}
            onBankAccount={() => navigate(ROUTES.PROFILE.BANK_ACCOUNT.absPath)}
            onChangePassword={() => navigate(ROUTES.PROFILE.CHANGE_PASSWORD.absPath)}
            onNotifications={() => navigate(ROUTES.PROFILE.NOTIFICATIONS.absPath)}
            onHelpDesk={() => navigate(ROUTES.PROFILE.HELP_DESK.absPath)}
            onPrivacyPolicy={() => navigate(ROUTES.PROFILE.PRIVACY_POLICY.absPath)}
            onEula={() => navigate(ROUTES.PROFILE.EULA.absPath)}
            onTerms={() => navigate(ROUTES.PROFILE.TERMS.absPath)}
            onDeleteAccount={startDeleteAccountFlow}
            onLogout={confirmLogout}
          />
        </div>
      </div>
    </div>
  );
}

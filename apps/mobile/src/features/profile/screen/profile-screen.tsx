import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppAvatar, AppText, ProfessionalView, colors, showConfirmationModal, showToast } from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ScrollView, View } from 'react-native';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { fileService } from '@shared/services/file-service';

import type { RootStackParamList } from '../../../app.navigation';
import { useMe } from '@features/profile/api/use-me';
import { startDeleteAccountFlow } from '../helpers/delete-account-flow';
import type { ProfileStackParamList } from '../profile-stack.navigation';
import { ProfileLinkCard } from './parts/profile-link-card';
import { ProfileMenu } from './parts/profile-menu';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList>;

/** Mirrors mobile/lib/features/profile/screen/profile_screen.dart. */
export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const queryClient = useQueryClient();
  const me = useMe();
  const { logout } = useAuthSession();

  const fullName = me.data?.fullName ?? '—';
  const handle = me.data?.handle;
  const shareUrl = handle ? `www.ohlify.com/${handle}` : 'Set a username to get a shareable link';

  async function copyLink() {
    if (!handle) {
      showToast('Set a username first', { type: 'info' });
      return;
    }
    await Clipboard.setStringAsync(shareUrl);
    showToast('Link copied', { type: 'success' });
  }

  async function handleLogout() {
    let confirmed = false;
    const modalHandle = showConfirmationModal('Log out?', 'You will need to sign in again to book or receive calls.', {
      kind: 'warning',
      confirmButtonText: 'Log out',
      cancelButtonText: 'Stay signed in',
      onConfirm: () => {
        confirmed = true;
      },
    });
    await modalHandle.onDismissed;
    if (!confirmed) return;
    await logout();
    queryClient.clear();
    showToast('Signed out', { type: 'info' });
    // ProfileStack -> Tab.Navigator -> RootStack: two getParent() hops.
    navigation.getParent()?.getParent<RootNavigation>()?.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" color={colors.textJet} align="left" weight="800">
              Your Profile
            </AppText>
            <View style={{ height: 2 }} />
            <AppText variant="body" color={colors.textMuted} align="left">
              {fullName}
            </AppText>
          </View>
          <View style={{ width: 12 }} />
          <AppAvatar fileKey={me.data?.avatarKey} resolveUri={fileService.mintViewUri} name={fullName} size={52} />
        </View>
        <ProfessionalView>
          <View style={{ height: 20 }} />
          <ProfileLinkCard profileUrl={shareUrl} onCopy={copyLink} />
        </ProfessionalView>
        <View style={{ height: 28 }} />
        <ProfileMenu
          onPersonalInfo={() => navigation.navigate('ProfilePersonalInfo')}
          onRates={() => navigation.navigate('ProfileRates')}
          onBankAccount={() => navigation.navigate('ProfileBankAccount')}
          onBookingBlocks={() => navigation.navigate('ProfileBookingBlocks')}
          onChangePassword={() => navigation.navigate('ProfileChangePassword')}
          onNotifications={() => navigation.navigate('ProfileNotifications')}
          onHelpDesk={() => navigation.navigate('ProfileHelpDesk')}
          onPrivacyPolicy={() => navigation.navigate('ProfilePrivacyPolicy')}
          onEula={() => navigation.navigate('ProfileEula')}
          onTerms={() => navigation.navigate('ProfileTerms')}
          onDeleteAccount={() => {
            const root = navigation.getParent()?.getParent<RootNavigation>();
            if (root) startDeleteAccountFlow({ navigation: root, queryClient, logout });
          }}
          onLogout={handleLogout}
        />
      </ScrollView>
    </View>
  );
}

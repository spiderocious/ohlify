import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RequireProfessional } from '@shared/guards/require-professional';

import { BankAccountScreen } from './screen/bank-account-screen';
import { BookingBlocksScreen } from './screen/booking-blocks-screen';
import { ChangePasswordScreen } from './screen/change-password-screen';
import { EulaScreen } from './screen/eula-screen';
import { HelpDeskScreen } from './screen/help-desk-screen';
import { NotificationPreferencesScreen } from './screen/notification-preferences-screen';
import { PersonalInfoScreen } from './screen/personal-info-screen';
import { PrivacyPolicyScreen } from './screen/privacy-policy-screen';
import { ProfileRatesScreen } from './screen/profile-rates-screen';
import { ProfileScreen } from './screen/profile-screen';
import { TermsScreen } from './screen/terms-screen';

/** Nested stack for the Profile tab. Mirrors mobile/lib/features/profile/profile_routes.dart's 10 sub-screens. */
export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfilePersonalInfo: undefined;
  ProfileRates: undefined;
  ProfileBankAccount: undefined;
  ProfileBookingBlocks: undefined;
  ProfileChangePassword: undefined;
  ProfileNotifications: undefined;
  ProfileHelpDesk: undefined;
  ProfilePrivacyPolicy: undefined;
  ProfileEula: undefined;
  ProfileTerms: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="ProfilePersonalInfo" component={PersonalInfoScreen} />
      <ProfileStack.Screen name="ProfileRates">{() => <RequireProfessional><ProfileRatesScreen /></RequireProfessional>}</ProfileStack.Screen>
      <ProfileStack.Screen name="ProfileBankAccount">{() => <RequireProfessional><BankAccountScreen /></RequireProfessional>}</ProfileStack.Screen>
      <ProfileStack.Screen name="ProfileBookingBlocks">{() => <RequireProfessional><BookingBlocksScreen /></RequireProfessional>}</ProfileStack.Screen>
      <ProfileStack.Screen name="ProfileChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="ProfileNotifications" component={NotificationPreferencesScreen} />
      <ProfileStack.Screen name="ProfileHelpDesk" component={HelpDeskScreen} />
      <ProfileStack.Screen name="ProfilePrivacyPolicy" component={PrivacyPolicyScreen} />
      <ProfileStack.Screen name="ProfileEula" component={EulaScreen} />
      <ProfileStack.Screen name="ProfileTerms" component={TermsScreen} />
    </ProfileStack.Navigator>
  );
}

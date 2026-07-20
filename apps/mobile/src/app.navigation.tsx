import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthStackNavigator, type AuthStackParamList } from './auth-stack.navigation';
import { MainTabsNavigator, type MainTabParamList } from './main-tabs.navigation';
import { KycSpecProvider } from '@features/onboarding/providers/kyc-spec-provider';
import { ClientKycScreen } from '@features/onboarding/screen/client-kyc-screen';
import { OnboardingScreen } from '@features/onboarding/screen/onboarding-screen';
import { ProfessionalKycScreen } from '@features/onboarding/screen/professional-kyc-screen';
import { KycRejectedScreen } from '@features/kyc-rejected/screen/kyc-rejected-screen';
import { RoleSelectionScreen } from '@features/role-selection/screen/role-selection-screen';
import { CallDetailsScreen } from '@features/call-details/screen/call-details-screen';
import { CallRatingScreen } from '@features/call-session/screen/call-rating-screen';
import { CallSessionScreen } from '@features/call-session/screen/call-session-screen';
import { NotificationsScreen } from '@features/notifications/screen/notifications-screen';
import { ProfessionalDetailsScreen } from '@features/professional-details/screen/professional-details-screen';
import { ProfessionalSearchScreen } from '@features/professional-search/screen/professional-search-screen';
import { SplashScreen } from '@features/splash/screen/splash-screen';
import { PaystackWebViewScreen } from '@features/wallet/screen/paystack-webview-screen';
import { RouteNotBuiltYet } from '@shared/parts/route-not-built-yet';

/**
 * Root navigator. Mirrors mobile/lib/app_router.dart's overall shape: splash
 * decides where to land, then the Auth stack (register/login/forgot-password
 * — see auth-stack.navigation.tsx) or the main tab shell takes over.
 * Splash, Onboarding, RoleSelection, ProfessionalKyc, ClientKyc, and
 * KycRejected are real screens; Home is a RouteNotBuiltYet placeholder
 * until its turn in docs/mobile-work/todo.md's Part 5 checklist.
 *
 * ProfessionalKyc/ClientKyc wrap KycSpecProvider locally (component-level,
 * not a nested navigator) — mirrors the Dart app_router.dart's ShellRoute
 * scoping: the spec is fetched once per KYC screen visit and shared by
 * every item modal, without being a global provider.
 *
 * The full StatefulShellRoute-equivalent bottom-tab shell and guard
 * redirects (architecture-spec.md §5) get built incrementally as those
 * screens land — this is intentionally not the final navigator shape yet.
 */
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: { screen?: keyof AuthStackParamList } | undefined;
  Home: { screen?: keyof MainTabParamList; params?: MainTabParamList[keyof MainTabParamList] } | undefined;
  KycRejected: undefined;
  ProfessionalKyc: undefined;
  ClientKyc: undefined;
  RoleSelection: undefined;
  PaystackWebView: { authorizationUrl: string; reference: string };
  Call: { callId: string };
  // Everything CallSessionScreen needs to drive the call-app WebView bridge.
  // Mirrors mobile/lib/shared/types/call_session.dart's CallSessionConfig —
  // passed directly as typed nav params instead of URL path/query segments
  // parsed with a mock-data fallback (the Dart source's _lookupPeer), since
  // RN Navigation params are already structured.
  CallSession: {
    sessionId: string;
    kind: 'audio' | 'video';
    role: 'caller' | 'callee';
    selfId: string;
    peerId: string;
    peerName: string;
    peerRole: string;
    peerAvatarUrl?: string;
    selfAvatarUrl?: string;
  };
  CallRating: { peerName: string; peerAvatarUrl?: string; callId?: string };
  Professional: { professionalId: string };
  Professionals: { focus?: boolean; category?: string } | undefined;
  ScheduleCall: { professionalId: string };
  Notifications: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

function ProfessionalKycRoute() {
  return (
    <KycSpecProvider>
      <ProfessionalKycScreen />
    </KycSpecProvider>
  );
}

function ClientKycRoute() {
  return (
    <KycSpecProvider>
      <ClientKycScreen />
    </KycSpecProvider>
  );
}

export function AppNavigation() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        <RootStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <RootStack.Screen name="Home" component={MainTabsNavigator} />
        <RootStack.Screen name="KycRejected" component={KycRejectedScreen} />
        <RootStack.Screen name="ProfessionalKyc" component={ProfessionalKycRoute} />
        <RootStack.Screen name="ClientKyc" component={ClientKycRoute} />
        <RootStack.Screen name="PaystackWebView" component={PaystackWebViewScreen} options={{ presentation: 'fullScreenModal' }} />
        <RootStack.Screen name="Call" component={CallDetailsScreen} />
        <RootStack.Screen name="CallSession" component={CallSessionScreen} options={{ gestureEnabled: false }} />
        <RootStack.Screen name="CallRating" component={CallRatingScreen} />
        <RootStack.Screen name="Professional" component={ProfessionalDetailsScreen} />
        <RootStack.Screen name="Professionals" component={ProfessionalSearchScreen} />
        <RootStack.Screen name="ScheduleCall">{() => <RouteNotBuiltYet name="ScheduleCall" />}</RootStack.Screen>
        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

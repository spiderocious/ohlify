import { lazy, Suspense, type ReactElement } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet as RouterOutlet,
  type RouteObject,
} from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppLoader, AppText } from '@ohlify/ui';
import { AppEntrypoint } from './app.entrypoint.js';
import { AppErrorBoundary } from './shared/errors/index.js';
import { AuthGuard } from './shared/guards/auth-guard.js';
import { OnboardingGuard } from './shared/guards/onboarding-guard.js';
import { RegisterProvider } from './features/auth-register/providers/register-provider.js';
import { ForgotPasswordProvider } from './features/auth-forgot-password/providers/forgot-password-provider.js';

function RegisterLayout() {
  return (
    <RegisterProvider>
      <AppErrorBoundary scope="route">
        <RouterOutlet />
      </AppErrorBoundary>
    </RegisterProvider>
  );
}
function ForgotPasswordLayout() {
  return (
    <ForgotPasswordProvider>
      <AppErrorBoundary scope="route">
        <RouterOutlet />
      </AppErrorBoundary>
    </ForgotPasswordProvider>
  );
}

const SplashScreen = lazy(() =>
  import('./features/splash/screen/splash-screen.js').then((m) => ({ default: m.SplashScreen })),
);

const OnboardingScreen = lazy(() =>
  import('./features/onboarding/screen/onboarding-screen.js').then((m) => ({
    default: m.OnboardingScreen,
  })),
);

const RegisterScreen = lazy(() =>
  import('./features/auth-register/screen/register-screen.js').then((m) => ({
    default: m.RegisterScreen,
  })),
);
const CreatePasswordScreen = lazy(() =>
  import('./features/auth-register/screen/create-password-screen.js').then((m) => ({
    default: m.CreatePasswordScreen,
  })),
);
const VerifyOtpScreen = lazy(() =>
  import('./features/auth-register/screen/verify-otp-screen.js').then((m) => ({
    default: m.VerifyOtpScreen,
  })),
);

const LoginScreen = lazy(() =>
  import('./features/auth-login/screen/login-screen.js').then((m) => ({ default: m.LoginScreen })),
);

const ForgotPasswordScreen = lazy(() =>
  import('./features/auth-forgot-password/screen/forgot-password-screen.js').then((m) => ({
    default: m.ForgotPasswordScreen,
  })),
);
const ForgotPasswordVerifyOtpScreen = lazy(() =>
  import('./features/auth-forgot-password/screen/forgot-password-verify-otp-screen.js').then(
    (m) => ({ default: m.ForgotPasswordVerifyOtpScreen }),
  ),
);
const ResetPasswordScreen = lazy(() =>
  import('./features/auth-forgot-password/screen/reset-password-screen.js').then((m) => ({
    default: m.ResetPasswordScreen,
  })),
);

const RoleSelectionScreen = lazy(() =>
  import('./features/role-selection/screen/role-selection-screen.js').then((m) => ({
    default: m.RoleSelectionScreen,
  })),
);

const ClientKycScreen = lazy(() =>
  import('./features/client-kyc/screen/client-kyc-screen.js').then((m) => ({
    default: m.ClientKycScreen,
  })),
);

const ProfessionalKycLayout = lazy(() =>
  import('./features/professional-kyc/screen/professional-kyc-layout.js').then((m) => ({
    default: m.ProfessionalKycLayout,
  })),
);
const ProfessionalKycScreen = lazy(() =>
  import('./features/professional-kyc/screen/professional-kyc-screen.js').then((m) => ({
    default: m.ProfessionalKycScreen,
  })),
);
const KycRejectedScreen = lazy(() =>
  import('./features/kyc-rejected/screen/kyc-rejected-screen.js').then((m) => ({
    default: m.KycRejectedScreen,
  })),
);
const WelcomeScreen = lazy(() =>
  import('./features/welcome/screen/welcome-screen.js').then((m) => ({ default: m.WelcomeScreen })),
);
const ComponentPreviewScreen = lazy(() =>
  import('./features/component-preview/screen/component-preview-screen.js').then((m) => ({
    default: m.ComponentPreviewScreen,
  })),
);

const MainShellLayout = lazy(() =>
  import('./shared/parts/main-shell-layout.js').then((m) => ({ default: m.MainShellLayout })),
);
const HomeScreen = lazy(() =>
  import('./features/home/screen/home-screen.js').then((m) => ({ default: m.HomeScreen })),
);
const ProfessionalSearchScreen = lazy(() =>
  import('./features/professional-search/screen/professional-search-screen.js').then((m) => ({
    default: m.ProfessionalSearchScreen,
  })),
);
const ProfessionalDetailsScreen = lazy(() =>
  import('./features/professional-details/screen/professional-details-screen.js').then((m) => ({
    default: m.ProfessionalDetailsScreen,
  })),
);

const CallsScreen = lazy(() =>
  import('./features/calls/screen/calls-screen.js').then((m) => ({ default: m.CallsScreen })),
);
const WalletScreen = lazy(() =>
  import('./features/wallet/screen/wallet-screen.js').then((m) => ({ default: m.WalletScreen })),
);
const NotificationsScreen = lazy(() =>
  import('./features/notifications/screen/notifications-screen.js').then((m) => ({
    default: m.NotificationsScreen,
  })),
);
const CallDetailsScreen = lazy(() =>
  import('./features/call-details/screen/call-details-screen.js').then((m) => ({
    default: m.CallDetailsScreen,
  })),
);
const ProfileLayout = lazy(() =>
  import('./features/profile/screen/profile-layout.js').then((m) => ({
    default: m.ProfileLayout,
  })),
);
const ProfileScreen = lazy(() =>
  import('./features/profile/screen/profile-screen.js').then((m) => ({
    default: m.ProfileScreen,
  })),
);
const PersonalInfoScreen = lazy(() =>
  import('./features/profile/screen/personal-info-screen.js').then((m) => ({
    default: m.PersonalInfoScreen,
  })),
);
const ProfileRatesScreen = lazy(() =>
  import('./features/profile/screen/profile-rates-screen.js').then((m) => ({
    default: m.ProfileRatesScreen,
  })),
);
const BankAccountScreen = lazy(() =>
  import('./features/profile/screen/bank-account-screen.js').then((m) => ({
    default: m.BankAccountScreen,
  })),
);
const BookingBlocksScreen = lazy(() =>
  import('./features/profile/screen/booking-blocks-screen.js').then((m) => ({
    default: m.BookingBlocksScreen,
  })),
);
const ChangePasswordScreen = lazy(() =>
  import('./features/profile/screen/change-password-screen.js').then((m) => ({
    default: m.ChangePasswordScreen,
  })),
);
const NotificationPreferencesScreen = lazy(() =>
  import('./features/profile/screen/notification-preferences-screen.js').then((m) => ({
    default: m.NotificationPreferencesScreen,
  })),
);
const HelpDeskScreen = lazy(() =>
  import('./features/profile/screen/help-desk-screen.js').then((m) => ({
    default: m.HelpDeskScreen,
  })),
);
const PrivacyPolicyScreen = lazy(() =>
  import('./features/profile/screen/privacy-policy-screen.js').then((m) => ({
    default: m.PrivacyPolicyScreen,
  })),
);
const EulaScreen = lazy(() =>
  import('./features/profile/screen/eula-screen.js').then((m) => ({ default: m.EulaScreen })),
);
const TermsScreen = lazy(() =>
  import('./features/profile/screen/terms-screen.js').then((m) => ({ default: m.TermsScreen })),
);

const CallSessionScreen = lazy(() =>
  import('./features/call-session/screen/call-session-screen.js').then((m) => ({
    default: m.CallSessionScreen,
  })),
);
const CallRatingScreen = lazy(() =>
  import('./features/call-session/screen/call-rating-screen.js').then((m) => ({
    default: m.CallRatingScreen,
  })),
);
const InstantCallScreen = lazy(() =>
  import('./features/instant-call/screen/instant-call-screen.js').then((m) => ({
    default: m.InstantCallScreen,
  })),
);
const ChatsScreen = lazy(() =>
  import('./features/chat/screen/chats-screen.js').then((m) => ({
    default: m.ChatsScreen,
  })),
);
const ChatThreadScreen = lazy(() =>
  import('./features/chat/screen/chat-thread-screen.js').then((m) => ({
    default: m.ChatThreadScreen,
  })),
);

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface-light"
    >
      <AppLoader size={36} />
      <AppText variant="body" align="center" color="var(--ohl-text-muted)">
        Loading…
      </AppText>
    </div>
  );
}

function lazyRoute(element: ReactElement): ReactElement {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const routes: RouteObject[] = [
  {
    path: ROUTES.ROOT.absPath,
    element: <AppEntrypoint />,
    children: [
      { index: true, element: lazyRoute(<SplashScreen />) },
      { path: 'welcome', element: lazyRoute(<WelcomeScreen />) },
      {
        path: ROUTES.COMPONENT_PREVIEW.relativePath,
        element: lazyRoute(<ComponentPreviewScreen />),
      },
      { path: ROUTES.ONBOARDING.relativePath, element: lazyRoute(<OnboardingScreen />) },

      // Auth — register (wrapped in RegisterProvider for cross-screen token flow)
      {
        path: ROUTES.REGISTER.relativePath,
        element: <RegisterLayout />,
        children: [
          { index: true, element: lazyRoute(<RegisterScreen />) },
          {
            path: ROUTES.REGISTER.CREATE_PASSWORD.relativePath,
            element: lazyRoute(<CreatePasswordScreen />),
          },
          {
            path: ROUTES.REGISTER.VERIFY_OTP.relativePath,
            element: lazyRoute(<VerifyOtpScreen />),
          },
        ],
      },

      // Auth — login
      { path: ROUTES.LOGIN.relativePath, element: lazyRoute(<LoginScreen />) },

      // Auth — forgot-password (wrapped in ForgotPasswordProvider for cross-screen token flow)
      {
        path: ROUTES.FORGOT_PASSWORD.relativePath,
        element: <ForgotPasswordLayout />,
        children: [
          { index: true, element: lazyRoute(<ForgotPasswordScreen />) },
          {
            path: ROUTES.FORGOT_PASSWORD.VERIFY_OTP.relativePath,
            element: lazyRoute(<ForgotPasswordVerifyOtpScreen />),
          },
          {
            path: ROUTES.FORGOT_PASSWORD.RESET.relativePath,
            element: lazyRoute(<ResetPasswordScreen />),
          },
        ],
      },

      // Protected: requires auth token
      {
        element: <AuthGuard />,
        children: [
          // Onboarding/role + KYC (post-auth, pre-onboarding-complete)
          { path: ROUTES.ROLE_SELECTION.relativePath, element: lazyRoute(<RoleSelectionScreen />) },
          { path: ROUTES.CLIENT_KYC.relativePath, element: lazyRoute(<ClientKycScreen />) },
          {
            path: ROUTES.PROFESSIONAL_KYC.relativePath,
            element: lazyRoute(<ProfessionalKycLayout />),
            children: [{ index: true, element: lazyRoute(<ProfessionalKycScreen />) }],
          },
          { path: ROUTES.KYC_REJECTED.relativePath, element: lazyRoute(<KycRejectedScreen />) },

          // Protected + onboarding-complete: main shell
          {
            element: <OnboardingGuard />,
            children: [
              {
                element: lazyRoute(<MainShellLayout />),
                children: [
                  { path: ROUTES.HOME.relativePath, element: lazyRoute(<HomeScreen />) },
                  { path: ROUTES.CALLS.relativePath, element: lazyRoute(<CallsScreen />) },
                  { path: ROUTES.CHATS.relativePath, element: lazyRoute(<ChatsScreen />) },
                  { path: ROUTES.WALLET.relativePath, element: lazyRoute(<WalletScreen />) },
                  // Scheduling removed from UI (calls revamp P5). The screen +
                  // API stay on disk (revivable); the route is just not mounted.
                  {
                    path: ROUTES.PROFESSIONAL.relativePath,
                    element: lazyRoute(<ProfessionalDetailsScreen />),
                  },
                  {
                    path: ROUTES.PROFILE.relativePath,
                    element: lazyRoute(<ProfileLayout />),
                    children: [
                      { index: true, element: lazyRoute(<ProfileScreen />) },
                      {
                        path: ROUTES.PROFILE.PERSONAL_INFO.relativePath,
                        element: lazyRoute(<PersonalInfoScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.RATES.relativePath,
                        element: lazyRoute(<ProfileRatesScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.BANK_ACCOUNT.relativePath,
                        element: lazyRoute(<BankAccountScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.BOOKING_BLOCKS.relativePath,
                        element: lazyRoute(<BookingBlocksScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.CHANGE_PASSWORD.relativePath,
                        element: lazyRoute(<ChangePasswordScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.NOTIFICATIONS.relativePath,
                        element: lazyRoute(<NotificationPreferencesScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.HELP_DESK.relativePath,
                        element: lazyRoute(<HelpDeskScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.PRIVACY_POLICY.relativePath,
                        element: lazyRoute(<PrivacyPolicyScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.EULA.relativePath,
                        element: lazyRoute(<EulaScreen />),
                      },
                      {
                        path: ROUTES.PROFILE.TERMS.relativePath,
                        element: lazyRoute(<TermsScreen />),
                      },
                    ],
                  },
                ],
              },

              // Discovery + standalone call routes (no shell)
              {
                path: ROUTES.PROFESSIONALS.relativePath,
                element: lazyRoute(<ProfessionalSearchScreen />),
              },
              {
                path: ROUTES.CALL.relativePath,
                element: lazyRoute(<CallDetailsScreen />),
              },
              {
                path: ROUTES.NOTIFICATIONS.relativePath,
                element: lazyRoute(<NotificationsScreen />),
              },
              { path: ROUTES.CALL_RATING.relativePath, element: lazyRoute(<CallRatingScreen />) },
              {
                path: ROUTES.CALL_SESSION.relativePath,
                element: lazyRoute(<CallSessionScreen />),
              },
              {
                path: ROUTES.INSTANT_CALL.relativePath,
                element: lazyRoute(<InstantCallScreen />),
              },
              {
                path: ROUTES.CHAT_THREAD.relativePath,
                element: lazyRoute(<ChatThreadScreen />),
              },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to={ROUTES.ROOT.absPath} replace /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);

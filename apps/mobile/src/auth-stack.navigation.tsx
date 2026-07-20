import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordFlowProvider } from '@features/auth/providers/forgot-password-flow-provider';
import { RegisterFlowProvider } from '@features/auth/providers/register-flow-provider';
import { ForgotPasswordScreen } from '@features/forgot-password/screen/forgot-password-screen';
import { ForgotPasswordVerifyOtpScreen } from '@features/forgot-password/screen/forgot-password-verify-otp-screen';
import { ResetPasswordScreen } from '@features/forgot-password/screen/reset-password-screen';
import { LoginScreen } from '@features/login/screen/login-screen';
import { CreatePasswordScreen } from '@features/register/screen/create-password-screen';
import { RegisterScreen } from '@features/register/screen/register-screen';
import { VerifyOtpScreen } from '@features/register/screen/verify-otp-screen';

/**
 * Auth stack — Register/Login/ForgotPassword flows. Mirrors the group of
 * routes under mobile/lib/app_router.dart's register_routes.dart,
 * login_routes.dart, forgot_password_routes.dart.
 *
 * RegisterFlowProvider/ForgotPasswordFlowProvider wrap the whole stack (not
 * just their own screens) so navigating Register → CreatePassword →
 * VerifyOtp — or ForgotPassword → VerifyOtp → ResetPassword — keeps the
 * in-flight token/email state alive across the screen transitions, matching
 * the Dart versions' route-shell scoping.
 */
export type AuthStackParamList = {
  Register: undefined;
  CreatePassword: undefined;
  VerifyOtp: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ForgotPasswordVerifyOtp: { email: string };
  ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  return (
    <RegisterFlowProvider>
      <ForgotPasswordFlowProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
          <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ForgotPasswordVerifyOtp" component={ForgotPasswordVerifyOtpScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </ForgotPasswordFlowProvider>
    </RegisterFlowProvider>
  );
}

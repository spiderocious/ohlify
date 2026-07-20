import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppIcon,
  AppIconButton,
  AppText,
  AppTextInput,
  colors,
  ScreenContinueBar,
  showToast,
} from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import type { OnboardingStep, AuthSession } from '@features/auth/types/auth-models';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';
import type { RootStackParamList } from '../../../app.navigation';

/** Mirrors mobile/lib/features/login/screen/login_screen.dart. */
type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ROUTE_BY_STEP: Partial<Record<OnboardingStep, keyof RootStackParamList>> = {
  kycRejected: 'KycRejected',
  roleSelection: 'RoleSelection',
  profile: 'RoleSelection',
  clientKyc: 'ClientKyc',
  professionalKyc: 'ProfessionalKyc',
  complete: 'Home',
};

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { login } = useAuthSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [obscurePassword, setObscurePassword] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  const isValid = email.length > 0 && password.length > 0;

  async function onSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setEmailError(undefined);
    setPasswordError(undefined);
    try {
      const session = await login({ email: email.trim(), password });
      routeAfterLogin(session);
    } catch (error) {
      if (error instanceof ApiError) handleError(error);
      else throw error;
    } finally {
      setSubmitting(false);
    }
  }

  function routeAfterLogin(session: AuthSession) {
    // Fast-path on onboarding step so we don't burn an extra
    // /onboarding/status round-trip right after login.
    const target = ROUTE_BY_STEP[session.onboardingStep] ?? 'Home';
    const root = navigation.getParent<RootNavigationProp>();
    root?.reset({ index: 0, routes: [{ name: target }] });
  }

  function handleError(error: ApiError) {
    if (error.isValidation) {
      setEmailError(error.fieldError('email'));
      setPasswordError(error.fieldError('password'));
      return;
    }
    if (error.reason === 'invalid_credentials') {
      setPasswordError('The email or password you entered is incorrect.');
      return;
    }
    showToast(error.message, { type: 'error' });
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 24 }}>
          <AppIconButton
            icon={<AppIcon name="back" size={18} color={colors.textPrimary} />}
            variant="outline"
            size={40}
            onPress={() => navigation.goBack()}
          />
          <View style={{ height: 28 }} />

          <Image source={IMAGES.logoPrimary} style={{ width: 40, height: 40 }} resizeMode="contain" />
          <View style={{ height: 20 }} />

          <AppText variant="bodyTitle" align="left" color={colors.textPrimary} weight="700">
            Log into your account
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="body" align="left" color={colors.textMuted}>
            Sign in to your account with your phone number or email address.
          </AppText>
          <View style={{ height: 28 }} />

          <AppTextInput
            label="Email address"
            placeholder="you@gmail.com"
            keyboardType="email-address"
            value={email}
            errorMessage={emailError}
            onChangeText={(v) => {
              setEmail(v);
              setEmailError(undefined);
            }}
          />
          <View style={{ height: 16 }} />

          <AppTextInput
            label="Password"
            placeholder="Enter preferred password"
            secureTextEntry={obscurePassword}
            value={password}
            errorMessage={passwordError}
            onChangeText={(v) => {
              setPassword(v);
              setPasswordError(undefined);
            }}
            endIcon={
              <Pressable onPress={() => setObscurePassword((v) => !v)}>
                <AppIcon name={obscurePassword ? 'eyeOff' : 'eye'} size={18} color={colors.textSlate} />
              </Pressable>
            }
          />
          <View style={{ height: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RememberMeToggle value={rememberMe} onChange={setRememberMe} />
            <View style={{ width: 10 }} />
            <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 13, color: colors.textMuted }}>Remember me</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 13, fontWeight: '600', color: colors.primary }}>
                Forgot password?
              </Text>
            </Pressable>
          </View>
          <View style={{ height: 24 }} />

          <Pressable onPress={() => navigation.navigate('Register')} style={{ alignSelf: 'center' }}>
            <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 13, color: colors.textMuted }}>
              Don't have an account?{' '}
              <Text style={{ fontFamily: 'MonaSans-SemiBold', fontWeight: '600', color: colors.primary }}>
                Create account
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ScreenContinueBar
        label={submitting ? 'Logging in…' : 'Login'}
        onPress={isValid && !submitting ? onSubmit : undefined}
      />
    </View>
  );
}

function RememberMeToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)}>
      <View
        style={{
          width: 36,
          height: 20,
          borderRadius: 100,
          backgroundColor: value ? colors.primary : colors.surface,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
          padding: 2,
        }}
      >
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.textWhite }} />
      </View>
    </Pressable>
  );
}

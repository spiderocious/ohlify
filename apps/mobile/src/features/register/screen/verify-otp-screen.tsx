import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppIcon,
  AppIconButton,
  AppOtpInput,
  AppText,
  colors,
  ScreenContinueBar,
  showFeedbackModal,
  showToast,
} from '@ohlify/mobile-ui';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRegisterFlow } from '@features/auth/providers/register-flow-provider';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';
import type { RootStackParamList } from '../../../app.navigation';

/**
 * Mirrors mobile/lib/features/register/screen/verify_otp_screen.dart. On
 * success this screen navigates to RoleSelection, which lives in the root
 * stack (not the auth stack) since it's reachable from both a fresh
 * registration and a returning-but-incomplete login — so the reset() call
 * targets the parent (root) navigator via getParent(), the standard React
 * Navigation pattern for crossing a nested navigator boundary.
 */
type VerifyOtpNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyOtp'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function secondsUntil(target: string | null): number {
  if (!target) return 0;
  const diff = Math.floor((new Date(target).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function VerifyOtpScreen() {
  const navigation = useNavigation<VerifyOtpNavigationProp>();
  const { otpDestinationMasked, resendAvailableAt, verify, resendOtp } = useRegisterFlow();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(resendAvailableAt));
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setSecondsLeft(secondsUntil(resendAvailableAt));
  }, [resendAvailableAt]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (secondsLeft <= 0) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secondsLeft > 0]);

  const canResend = secondsLeft === 0 && !resending;

  async function onVerify() {
    if (otp.length !== 6 || submitting) return;
    setSubmitting(true);
    setOtpError(undefined);
    try {
      await verify(otp);
      showFeedbackModal(
        'Account Created Successfully',
        'Great! Your account has been created. You can now proceed to log in with your details.',
        {
          kind: 'success',
          position: 'fullscreen',
          showCloseButton: false,
          dismissible: false,
          confirmButtonText: 'Continue',
          onConfirm: () =>
            navigation
              .getParent<RootNavigationProp>()
              ?.reset({ index: 0, routes: [{ name: 'RoleSelection' }] }),
        },
      );
    } catch (error) {
      if (error instanceof ApiError) handleError(error);
      else throw error;
    } finally {
      setSubmitting(false);
    }
  }

  function handleError(error: ApiError) {
    switch (error.reason) {
      case 'invalid_otp':
        setOtpError('Incorrect code. Please try again.');
        return;
      case 'otp_expired':
        setOtpError('This code has expired. Tap "Resend code" to get a new one.');
        return;
      case 'otp_max_attempts':
        setOtpError('Too many incorrect attempts. Please request a new code.');
        return;
      case 'token_invalid':
        showToast('This registration session has expired. Please start over.', { type: 'error' });
        navigation.navigate('Register');
        return;
      case 'credential_not_set':
        showToast('Please set your password first.', { type: 'error' });
        navigation.navigate('CreatePassword');
        return;
      default:
        showToast(error.message, { type: 'error' });
    }
  }

  async function onResend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    try {
      await resendOtp();
      showToast('A new code has been sent.', { type: 'success' });
    } catch (error) {
      if (error instanceof ApiError) showToast(error.message, { type: 'error' });
      else throw error;
    } finally {
      setResending(false);
    }
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
            Authentication
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="body" align="left" color={colors.textMuted}>
            {otpDestinationMasked
              ? `Enter the 6-digit code sent to ${otpDestinationMasked}.`
              : 'Enter the 6-digit code sent to the email or phone you provided.'}
          </AppText>
          <View style={{ height: 32 }} />

          <AppOtpInput
            length={6}
            autoFocus
            onChangeText={(v) => {
              setOtp(v);
              setOtpError(undefined);
            }}
            onComplete={setOtp}
            errorMessage={otpError}
          />
          <View style={{ height: 20 }} />

          <View style={{ flexDirection: 'row' }}>
            <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 13, color: colors.textMuted }}>
              Didn't get the code?{' '}
            </Text>
            <Pressable onPress={canResend ? onResend : undefined}>
              <Text
                style={{
                  fontFamily: 'MonaSans-SemiBold',
                  fontSize: 13,
                  fontWeight: '600',
                  color: canResend ? colors.primary : colors.textMuted,
                }}
              >
                {resending ? 'Resending…' : canResend ? 'Resend code' : `Resend in ${formatCountdown(secondsLeft)}`}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ScreenContinueBar
        label={submitting ? 'Verifying…' : 'Continue'}
        onPress={otp.length === 6 && !submitting ? onVerify : undefined}
      />
    </View>
  );
}

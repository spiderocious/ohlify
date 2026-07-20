import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, AppIconButton, AppOtpInput, colors, ScreenContinueBar, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useForgotPasswordFlow } from '@features/auth/providers/forgot-password-flow-provider';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';

/**
 * Mirrors mobile/lib/features/forgot_password/screen/forgot_password_verify_otp_screen.dart.
 * Backend doesn't tell us when the next resend is allowed for forgot-password,
 * so use the same 60s cooldown customer-web uses (per the Dart source comment).
 */
const RESEND_SECONDS = 60;

type VerifyOtpNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordVerifyOtp'>;
type VerifyOtpRouteProp = RouteProp<AuthStackParamList, 'ForgotPasswordVerifyOtp'>;

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/** Masks email: ade**ji@gmail.com */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain || !name || name.length <= 4) return email;
  return `${name.slice(0, 3)}**${name.slice(-2)}@${domain}`;
}

export function ForgotPasswordVerifyOtpScreen() {
  const navigation = useNavigation<VerifyOtpNavigationProp>();
  const { params } = useRoute<VerifyOtpRouteProp>();
  const { verifyOtp, initiate } = useForgotPasswordFlow();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const tick = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  function startCountdown() {
    clearInterval(intervalRef.current);
    setSecondsLeft(RESEND_SECONDS);
    tick();
  }

  useEffect(() => {
    tick();
    return () => clearInterval(intervalRef.current);
  }, [tick]);

  const canResend = secondsLeft === 0 && !resending;
  const maskedEmail = maskEmail(params.email);

  async function onVerify() {
    if (otp.length !== 6 || submitting) return;
    setSubmitting(true);
    setOtpError(undefined);
    try {
      await verifyOtp(otp);
      navigation.navigate('ResetPassword');
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
      default:
        showToast(error.message, { type: 'error' });
    }
  }

  async function onResend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    try {
      await initiate(params.email);
      startCountdown();
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIconButton
              icon={<AppIcon name="back" size={18} color={colors.textPrimary} />}
              variant="outline"
              size={40}
              onPress={() => navigation.goBack()}
            />
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: 'MonaSans-SemiBold',
                fontSize: 16,
                fontWeight: '600',
                color: colors.textMuted,
              }}
            >
              Verification
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ height: 32 }} />

          <Text
            style={{ fontFamily: 'MonaSans-Bold', fontSize: 20, fontWeight: '700', color: colors.textPrimary, lineHeight: 32 }}
          >
            Please enter the 6-digit OTP we sent to {maskedEmail}
          </Text>
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

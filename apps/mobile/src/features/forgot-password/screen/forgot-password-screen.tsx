import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, AppIconButton, AppText, AppTextInput, colors, ScreenContinueBar, showToast } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useForgotPasswordFlow } from '@features/auth/providers/forgot-password-flow-provider';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';

/** Mirrors mobile/lib/features/forgot_password/screen/forgot_password_screen.dart. */
const EMAIL_REGEX = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

type ForgotPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const { initiate } = useForgotPasswordFlow();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string>();

  const emailValid = EMAIL_REGEX.test(email);

  async function onContinue() {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setEmailError(undefined);
    try {
      const trimmed = email.trim();
      await initiate(trimmed);
      navigation.navigate('ForgotPasswordVerifyOtp', { email: trimmed });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isValidation) setEmailError(error.fieldError('email'));
        else showToast(error.message, { type: 'error' });
      } else throw error;
    } finally {
      setSubmitting(false);
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
              Forgot Password
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ height: 32 }} />

          <AppText variant="bodyTitle" align="left" color={colors.textPrimary} weight="700">
            Provide the credentials below to get started.
          </AppText>
          <View style={{ height: 28 }} />

          <AppTextInput
            label="Email"
            placeholder="Ex. you@example.com"
            keyboardType="email-address"
            value={email}
            errorMessage={emailError ?? (email.length > 0 && !emailValid ? 'Please enter a valid email address.' : undefined)}
            onChangeText={(v) => {
              setEmail(v);
              setEmailError(undefined);
            }}
          />
        </ScrollView>
      </SafeAreaView>

      <ScreenContinueBar
        label={submitting ? 'Sending OTP…' : 'Continue'}
        onPress={emailValid && !submitting ? onContinue : undefined}
      />
    </View>
  );
}

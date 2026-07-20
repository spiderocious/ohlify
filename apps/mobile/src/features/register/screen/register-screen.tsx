import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppIcon,
  AppIconButton,
  AppPhoneInput,
  AppText,
  AppTextInput,
  colors,
  ScreenContinueBar,
  showToast,
} from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRegisterFlow } from '@features/auth/providers/register-flow-provider';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';

/** Mirrors mobile/lib/features/register/screen/register_screen.dart. */
const DIAL_CODE = '+234';
const EMAIL_REGEX = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { initiate } = useRegisterFlow();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [phoneError, setPhoneError] = useState<string>();

  const emailValid = EMAIL_REGEX.test(email);
  const isValid = phone.length >= 10 && emailValid && !submitting;

  function toE164Phone(): string {
    const digits = phone.replace(/\D/g, '');
    const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
    return `${DIAL_CODE}${withoutLeadingZero}`;
  }

  async function onContinue() {
    if (!isValid) return;
    setSubmitting(true);
    setEmailError(undefined);
    setPhoneError(undefined);
    try {
      await initiate({ email: email.trim(), phone: toE164Phone(), channel: 'email' });
      navigation.navigate('CreatePassword');
    } catch (error) {
      if (error instanceof ApiError) handleError(error);
      else throw error;
    } finally {
      setSubmitting(false);
    }
  }

  function handleError(error: ApiError) {
    if (error.isValidation) {
      setEmailError(error.fieldError('email'));
      setPhoneError(error.fieldError('phone'));
      return;
    }
    if (error.reason === 'email_exists') {
      setEmailError('An account with this email already exists.');
      return;
    }
    if (error.reason === 'phone_exists') {
      setPhoneError('An account with this phone number already exists.');
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
            Create an account
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="body" align="left" color={colors.textMuted}>
            Create an account with your phone number or email address below.
          </AppText>
          <View style={{ height: 28 }} />

          <AppPhoneInput
            label="Phone number"
            placeholder="808 123 4567"
            value={phone}
            errorMessage={phoneError}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError(undefined);
            }}
          />
          <View style={{ height: 16 }} />
          <AppTextInput
            label="Email address"
            placeholder="you@example.com"
            keyboardType="email-address"
            value={email}
            errorMessage={emailError ?? (email.length > 0 && !emailValid ? 'Please enter a valid email address.' : undefined)}
            onChangeText={(v) => {
              setEmail(v);
              setEmailError(undefined);
            }}
          />
          <View style={{ height: 20 }} />

          <TermsText />
          <View style={{ height: 24 }} />

          <Pressable onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'center' }}>
            <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 13, color: colors.textMuted }}>
              Already have an account?{' '}
              <Text style={{ fontFamily: 'MonaSans-SemiBold', fontWeight: '600', color: colors.primary }}>Log in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ScreenContinueBar label={submitting ? 'Sending OTP…' : 'Continue'} onPress={isValid ? onContinue : undefined} />
    </View>
  );
}

function TermsText() {
  return (
    <Text
      style={{
        fontFamily: 'MonaSans-Regular',
        fontSize: 13,
        fontWeight: '400',
        color: colors.textMuted,
        lineHeight: 20.8,
      }}
    >
      By clicking "Continue", you agree to our{' '}
      <Text style={{ color: colors.primary, fontFamily: 'MonaSans-Medium', fontWeight: '500' }}>
        Terms and Conditions
      </Text>{' '}
      and <Text style={{ color: colors.primary, fontFamily: 'MonaSans-Medium', fontWeight: '500' }}>Privacy Policy</Text>.
    </Text>
  );
}

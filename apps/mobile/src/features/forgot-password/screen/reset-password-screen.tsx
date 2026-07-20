import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppIcon,
  AppIconButton,
  AppText,
  AppTextInput,
  colors,
  ScreenContinueBar,
  showFeedbackModal,
  showToast,
} from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useForgotPasswordFlow } from '@features/auth/providers/forgot-password-flow-provider';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { AuthStackParamList } from '../../../auth-stack.navigation';

/** Mirrors mobile/lib/features/forgot_password/screen/reset_password_screen.dart. */
const SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>@&$*]/;

type ResetPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const { reset } = useForgotPasswordFlow();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [obscurePassword, setObscurePassword] = useState(true);
  const [obscureConfirm, setObscureConfirm] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = SPECIAL_REGEX.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const isValid = hasMinLength && hasNumber && hasSpecial && hasUppercase && hasLowercase && passwordsMatch && !submitting;

  async function onSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setPasswordError(undefined);
    try {
      await reset(password);
      showFeedbackModal(
        'Password Reset Successful',
        'Your password has been reset successfully. You can now log in with your new password.',
        {
          kind: 'success',
          position: 'fullscreen',
          showCloseButton: false,
          dismissible: false,
          confirmButtonText: 'Login',
          onConfirm: () => navigation.navigate('Login'),
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
    if (error.isValidation) {
      setPasswordError(error.fieldError('new_password'));
      return;
    }
    if (error.reason === 'token_invalid') {
      showToast('Your reset session has expired. Please start over.', { type: 'error' });
      navigation.navigate('ForgotPassword');
      return;
    }
    showToast(error.message, { type: 'error' });
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
              Reset Password
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ height: 28 }} />

          <Image source={IMAGES.logoPrimary} style={{ width: 40, height: 40 }} resizeMode="contain" />
          <View style={{ height: 20 }} />

          <AppText variant="bodyTitle" align="left" color={colors.textPrimary} weight="700">
            Create new password
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="body" align="left" color={colors.textMuted}>
            Set a new password to secure your account.
          </AppText>
          <View style={{ height: 28 }} />

          <AppTextInput
            label="New password"
            placeholder="Enter new password"
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
          <AppTextInput
            label="Confirm password"
            placeholder="Enter new password"
            secureTextEntry={obscureConfirm}
            value={confirm}
            onChangeText={setConfirm}
            errorMessage={confirm.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
            endIcon={
              <Pressable onPress={() => setObscureConfirm((v) => !v)}>
                <AppIcon name={obscureConfirm ? 'eyeOff' : 'eye'} size={18} color={colors.textSlate} />
              </Pressable>
            }
          />
          <View style={{ height: 24 }} />

          <PasswordRules
            hasMinLength={hasMinLength}
            hasNumber={hasNumber}
            hasSpecial={hasSpecial}
            hasUppercase={hasUppercase}
            hasLowercase={hasLowercase}
          />
        </ScrollView>
      </SafeAreaView>

      <ScreenContinueBar label={submitting ? 'Saving…' : 'Continue'} onPress={isValid ? onSubmit : undefined} />
    </View>
  );
}

interface PasswordRulesProps {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
}

function PasswordRules({ hasMinLength, hasNumber, hasSpecial, hasUppercase, hasLowercase }: PasswordRulesProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 12 }}>
      <RuleChip label="Minimum 8 characters" met={hasMinLength} />
      <RuleChip label="Number" met={hasNumber} />
      <RuleChip label="Special character (e.g., @&$*)" met={hasSpecial} />
      <RuleChip label="UPPERCASE letter" met={hasUppercase} />
      <RuleChip label="lowercase letter" met={hasLowercase} />
    </View>
  );
}

function RuleChip({ label, met }: { label: string; met: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: met ? `${colors.success}1F` : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="check" size={14} color={met ? colors.success : colors.textSlate} />
      </View>
      <View style={{ width: 8 }} />
      <Text
        style={{
          fontFamily: 'MonaSans-Regular',
          fontSize: 13,
          fontWeight: '400',
          color: met ? colors.textPrimary : colors.textSlate,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

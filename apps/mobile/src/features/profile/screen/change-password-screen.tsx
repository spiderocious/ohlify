import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppText, AppTextInput, colors, showToast } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { RootStackParamList } from '../../../app.navigation';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { profileApi } from '@features/profile/api/profile-api';
import { runSensitiveActionFlow } from '@features/profile/helpers/otp-gate';
import { PasswordRuleRow } from './parts/password-rule-row';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Mirrors mobile/lib/features/profile/screen/change_password_screen.dart. */
export function ChangePasswordScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { logout } = useAuthSession();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasMinLength = next.length >= 8;
  const hasNumber = /\d/.test(next);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=/[\]`~]/.test(next);
  const hasUpper = /[A-Z]/.test(next);
  const isValid = current.length > 0 && hasMinLength && hasNumber && hasSpecial && hasUpper;

  async function onSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const ok = await runSensitiveActionFlow({
      action: 'change_password',
      onSubmit: (otp) => profileApi.changePassword({ currentPassword: current, newPassword: next, otp }),
    });

    setSubmitting(false);
    if (!ok) return;

    showToast('Password updated. Please log in again.', { type: 'success' });
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
  }

  const body = (
    <View>
      <AppTextInput
        label="Current password"
        value={current}
        placeholder="Old password"
        secureTextEntry={!showCurrent}
        endIcon={
          <Pressable onPress={() => setShowCurrent((v) => !v)}>
            <AppIcon name={showCurrent ? 'eyeOff' : 'eye'} size={20} color={colors.textSlate} />
          </Pressable>
        }
        onChangeText={setCurrent}
      />
      <View style={{ height: 20 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <View style={{ width: 10 }} />
        <AppIcon name="settings" size={14} color={colors.textMuted} />
        <View style={{ width: 6 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="center">
          New password
        </AppText>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <View style={{ height: 16 }} />
      <AppTextInput
        label="New password"
        value={next}
        placeholder="New password"
        secureTextEntry={!showNext}
        endIcon={
          <Pressable onPress={() => setShowNext((v) => !v)}>
            <AppIcon name={showNext ? 'eyeOff' : 'eye'} size={20} color={colors.textSlate} />
          </Pressable>
        }
        onChangeText={setNext}
      />
      <View style={{ height: 14 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <PasswordRuleRow label="Minimum 8 characters" satisfied={hasMinLength} />
        <PasswordRuleRow label="Number" satisfied={hasNumber} />
        <PasswordRuleRow label="Special character (e.g., @&$*)" satisfied={hasSpecial} />
        <PasswordRuleRow label="UPPERCASE letter" satisfied={hasUpper} />
      </View>
    </View>
  );

  const bottom = (
    <View>
      <AppButton label={submitting ? 'Saving…' : 'Change password'} expanded radius={100} isDisabled={!isValid || submitting} onPress={!isValid || submitting ? undefined : onSubmit} />
      <View style={{ height: 10 }} />
      <AppButton label="Forgot password" variant="outline" expanded radius={100} onPress={() => navigation.navigate('Auth', { screen: 'ForgotPassword' })} />
    </View>
  );

  return <ProfileSubscreenScaffold title="Change Password" body={body} bottom={bottom} />;
}

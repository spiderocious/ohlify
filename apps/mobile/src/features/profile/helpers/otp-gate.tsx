import { AppButton, AppOtpInput, AppText, colors, showCustomModal, showToast } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { profileApi, type SensitiveAction } from '../api/profile-api';

/**
 * Drives a sensitive-action OTP flow end-to-end. Mirrors
 * mobile/lib/features/profile/helpers/otp_gate.dart.
 *
 * 1. Requests an OTP for `action`, pulls back the masked destination.
 * 2. Opens a modal with the OTP input + masked destination + resend.
 * 3. On submit, calls onSubmit(otp). On invalid_otp/otp_expired/
 *    otp_max_attempts, the modal stays open with an inline error. On any
 *    other ApiError, dismisses + toasts.
 *
 * Resolves true when onSubmit completed successfully.
 */
export async function runSensitiveActionFlow(params: {
  action: SensitiveAction;
  onSubmit: (otp: string) => Promise<void>;
  customChannelHint?: string;
}): Promise<boolean> {
  let destination = '';
  try {
    const res = await profileApi.requestSensitiveOtp(params.action);
    destination = res.destinationMasked;
  } catch (e) {
    const error = e instanceof ApiError ? e : ApiError.network;
    showToast(error.reason === 'rate_limited' ? 'Too many OTP requests. Try again in a few minutes.' : apiErrorMessage(error), { type: 'error' });
    return false;
  }

  const dest = destination || 'your account';
  const hint = params.customChannelHint ?? `We sent a 6-digit code to ${dest} to confirm this action.`;

  return openVerifyModal({ action: params.action, hint, onSubmit: params.onSubmit });
}

function openVerifyModal(params: { action: SensitiveAction; hint: string; onSubmit: (otp: string) => Promise<void> }): Promise<boolean> {
  let completed = false;
  let dismiss: () => void = () => undefined;

  const handle = showCustomModal(
    "Verify it's you",
    (onDismiss) => {
      dismiss = onDismiss;
      return (
        <SensitiveOtpForm
          channelHint={params.hint}
          onResend={async () => {
            try {
              await profileApi.requestSensitiveOtp(params.action);
              showToast('A new code has been sent.', { type: 'success' });
            } catch (e) {
              showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
            }
          }}
          onSubmit={async (otp) => {
            try {
              await params.onSubmit(otp);
              completed = true;
              dismiss();
              return undefined;
            } catch (e) {
              const error = e instanceof ApiError ? e : ApiError.network;
              if (error.reason === 'invalid_otp') return 'Incorrect code. Please try again.';
              if (error.reason === 'otp_expired') return 'This code has expired. Tap "Resend code".';
              if (error.reason === 'otp_max_attempts') return 'Too many attempts. Request a new code.';
              dismiss();
              showToast(apiErrorMessage(error), { type: 'error' });
              return undefined;
            }
          }}
        />
      );
    },
    { position: 'center' },
  );

  return handle.onDismissed.then(() => completed);
}

function SensitiveOtpForm({
  channelHint,
  onResend,
  onSubmit,
}: {
  channelHint: string;
  onResend: () => Promise<void>;
  onSubmit: (otp: string) => Promise<string | undefined>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function verify() {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(undefined);
    const inlineError = await onSubmit(code);
    setBusy(false);
    setError(inlineError);
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    await onResend();
    setResending(false);
  }

  const canSubmit = !busy && code.length === 6;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {channelHint}
      </AppText>
      <View style={{ height: 20 }} />
      <AppOtpInput
        length={6}
        onChangeText={(v) => {
          setCode(v);
          setError(undefined);
        }}
        onComplete={setCode}
      />
      {error ? (
        <>
          <View style={{ height: 8 }} />
          <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error }}>{error}</Text>
        </>
      ) : null}
      <View style={{ height: 14 }} />
      <Pressable onPress={resending ? undefined : resend}>
        <AppText variant="body" color={colors.primary} weight="600" align="center">
          {resending ? 'Sending…' : 'Resend code'}
        </AppText>
      </Pressable>
      <View style={{ height: 20 }} />
      <AppButton label={busy ? 'Verifying…' : 'Verify'} expanded radius={100} isDisabled={!canSubmit} onPress={!canSubmit ? undefined : verify} />
    </View>
  );
}

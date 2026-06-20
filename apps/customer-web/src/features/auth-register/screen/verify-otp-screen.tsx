import { Show } from 'meemaw';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppOtpInput, DrawerService } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { AuthScreenShell } from '../../../shared/parts/auth-screen-shell.js';
import { useRegisterVerify } from '../api/use-register-verify.js';
import { useRegisterResendOtp } from '../api/use-register-resend-otp.js';
import { useRegisterContext } from '../providers/register-provider.js';

const RESEND_SECONDS = 300;
const pad = (n: number) => n.toString().padStart(2, '0');

export function VerifyOtpScreen() {
  const navigate = useNavigate();
  const { state, setRegisterState } = useRegisterContext();
  const verify = useRegisterVerify();
  const resend = useRegisterResendOtp();
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [otpError, setOtpError] = useState<string | undefined>();

  useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const canResend = secondsLeft === 0;
  const countdown = `${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`;

  const handleContinue = () => {
    if (!state) return;
    setOtpError(undefined);
    verify.mutate(
      { registration_token: state.registrationToken, otp },
      {
        onSuccess: (data) => {
          DrawerService.showFeedbackModal(
            'Account Created Successfully',
            'Great! Your account has been created. You can now proceed to log in with your details.',
            {
              kind: 'success',
              position: 'fullscreen',
              showCloseButton: false,
              dismissible: false,
              confirmButtonText: 'Continue',
              onConfirm: () => {
                if (data.onboarding_step !== 'complete') {
                  navigate(ROUTES.ROLE_SELECTION.absPath, { replace: true });
                } else {
                  navigate(ROUTES.HOME.absPath, { replace: true });
                }
              },
            },
          );
        },
        onError: (err) => {
          const apiErr = err as unknown as ApiError;
          if (apiErr.reason === 'invalid_otp') {
            setOtpError('Incorrect code. Please try again.');
          } else if (apiErr.reason === 'otp_expired') {
            setOtpError('Code expired. Please request a new one.');
          } else {
            setOtpError('Something went wrong. Please try again.');
          }
        },
      },
    );
  };

  const handleResend = () => {
    if (!state || !canResend) return;
    resend.mutate(
      { registration_token: state.registrationToken },
      {
        onSuccess: (data) => {
          setRegisterState({ ...state, resendAvailableAt: data.resend_available_at });
          setSecondsLeft(RESEND_SECONDS);
        },
      },
    );
  };

  return (
    <AuthScreenShell
      title="Authentication"
      subtitle="Enter the 6-six digit code sent to the email address or phone number you provided below."
      onContinue={otp.length === 6 && !verify.isPending ? handleContinue : undefined}
    >
      <AppOtpInput length={6} autoFocus onChange={setOtp} />
      {otpError && <p className="mt-2 font-sans text-[13px] text-error">{otpError}</p>}

      <div className="mt-5 flex items-center font-sans text-[13px]">
        <span className="text-text-muted">Didn&apos;t get the code? </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || resend.isPending}
          className="ml-1 font-semibold"
          style={{ color: canResend ? 'var(--ohl-primary)' : 'var(--ohl-text-muted)' }}
        >
          <Show when={canResend} fallback={<>Resend in {countdown}</>}>
            Resend code
          </Show>
        </button>
      </div>
    </AuthScreenShell>
  );
}

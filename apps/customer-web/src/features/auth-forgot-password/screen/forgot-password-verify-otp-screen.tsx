import { Show } from 'meemaw';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppOtpInput } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { AuthScreenShell } from '../../../shared/parts/auth-screen-shell.js';
import { useFpVerifyOtp } from '../api/use-fp-verify-otp.js';
import { useForgotPasswordContext } from '../providers/forgot-password-provider.js';

const RESEND_SECONDS = 300;
const pad = (n: number) => n.toString().padStart(2, '0');

export function ForgotPasswordVerifyOtpScreen() {
  const navigate = useNavigate();
  const { state, setResetToken } = useForgotPasswordContext();
  const verifyOtp = useFpVerifyOtp();
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
    verifyOtp.mutate(
      { email: state.email, otp },
      {
        onSuccess: (data) => {
          setResetToken(state.email, data.reset_token);
          navigate(ROUTES.FORGOT_PASSWORD.RESET.absPath);
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

  return (
    <AuthScreenShell
      title="Authentication"
      subtitle="Enter the 6-six digit code we sent to the email address you provided."
      onContinue={otp.length === 6 && !verifyOtp.isPending ? handleContinue : undefined}
    >
      <AppOtpInput length={6} autoFocus onChange={setOtp} />
      {otpError && <p className="mt-2 font-sans text-[13px] text-error">{otpError}</p>}
      <div className="mt-5 flex items-center font-sans text-[13px]">
        <span className="text-text-muted">Didn&apos;t get the code? </span>
        <button
          type="button"
          onClick={() => canResend && setSecondsLeft(RESEND_SECONDS)}
          disabled={!canResend}
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

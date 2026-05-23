import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppPhoneInput, AppText, AppTextInput } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { AuthScreenShell } from '../../../shared/parts/auth-screen-shell.js';
import { useRegisterInitiate } from '../api/use-register-initiate.js';
import { useRegisterContext } from '../providers/register-provider.js';

const EMAIL_RE = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

export function RegisterScreen() {
  const navigate = useNavigate();
  const { setRegisterState } = useRegisterContext();
  const initiate = useRegisterInitiate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nonFieldError, setNonFieldError] = useState<string | undefined>();

  const emailValid = EMAIL_RE.test(email);
  const isValid = phone.length >= 10 && emailValid;

  const handleContinue = () => {
    setNonFieldError(undefined);
    initiate.mutate(
      { email, phone: `+234${phone.replace(/^0/, '')}`, channel: 'email' },
      {
        onSuccess: (data) => {
          setRegisterState({
            registrationToken: data.registration_token,
            otpDestinationMasked: data.otp_destination_masked,
            resendAvailableAt: data.resend_available_at,
          });
          navigate(ROUTES.REGISTER.CREATE_PASSWORD.absPath);
        },
        onError: (err) => {
          const apiErr = err as unknown as ApiError;
          if (apiErr.code === 'email_exists') {
            setNonFieldError('An account with this email already exists.');
          } else if (apiErr.code === 'phone_exists') {
            setNonFieldError('An account with this phone number already exists.');
          } else {
            setNonFieldError('Something went wrong. Please try again.');
          }
        },
      },
    );
  };

  return (
    <AuthScreenShell
      title="Create an account"
      subtitle="Create an account with your phone number or email address below."
      onContinue={isValid && !initiate.isPending ? handleContinue : undefined}
    >
      <AppPhoneInput
        label="Phone number"
        placeholder="808 123 4567"
        value={phone}
        onChange={setPhone}
      />
      <div className="mt-4">
        <AppTextInput
          label="Email address"
          placeholder="you@example.com"
          inputType="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          errorMessage={
            nonFieldError ??
            (email !== '' && !emailValid ? 'Please enter a valid email address.' : undefined)
          }
        />
      </div>
      <div className="mt-5">
        <AppText variant="body" align="start" color="var(--ohl-text-muted)">
          By clicking &quot;Continue&quot;, you agree to our{' '}
          <button
            type="button"
            className="font-medium text-primary"
            onClick={() => navigate(ROUTES.PROFILE.TERMS.absPath)}
          >
            Terms and Conditions
          </button>{' '}
          and{' '}
          <button
            type="button"
            className="font-medium text-primary"
            onClick={() => navigate(ROUTES.PROFILE.PRIVACY_POLICY.absPath)}
          >
            Privacy Policy
          </button>
          .
        </AppText>
      </div>
      <div className="mt-6 text-center font-sans text-[13px] text-text-muted">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate(ROUTES.LOGIN.absPath)}
          className="font-semibold text-primary"
        >
          Log in
        </button>
      </div>
    </AuthScreenShell>
  );
}

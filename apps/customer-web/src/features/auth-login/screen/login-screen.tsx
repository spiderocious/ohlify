import { IconEye, IconEyeOff } from '@icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppTextInput, cn } from '@ohlify/ui';

import { AuthScreenShell } from '../../../shared/parts/auth-screen-shell.js';
import { useLogin } from '../api/use-login.js';
import type { ApiError } from '@ohlify/api';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  account_locked: 'Account temporarily locked. Try again later.',
  account_suspended: 'Your account has been suspended.',
  account_blocked: 'Your account has been blocked.',
  validation_error: 'Please check your email and password.',
};

function authErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

export function LoginScreen() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const isValid = email !== '' && password !== '';

  const handleContinue = () => {
    setFieldError(undefined);
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          // Hard fast-path: rejected users go straight to the rejection
          // screen without having to wait for OnboardingGuard to fetch
          // /onboarding/status. The guard still routes from any other
          // entry-point — this just shaves a round-trip on login.
          if (data.onboarding_step === 'kyc_rejected') {
            navigate(ROUTES.KYC_REJECTED.absPath, { replace: true });
            return;
          }
          if (data.onboarding_step !== 'complete') {
            navigate(ROUTES.ROLE_SELECTION.absPath);
          } else {
            navigate(ROUTES.HOME.absPath, { replace: true });
          }
        },
        onError: (err) => {
          const apiErr = err as unknown as ApiError;
          setFieldError(authErrorMessage(apiErr.reason));
        },
      },
    );
  };

  return (
    <AuthScreenShell
      title="Log into your account"
      subtitle="Sign in to your account with your phone number or email address."
      ctaLabel="Login"
      onContinue={isValid && !login.isPending ? handleContinue : undefined}
    >
      <AppTextInput
        label="Email address"
        placeholder="Adedeji@gmail.com"
        inputType="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
      />
      <div className="mt-4">
        <AppTextInput
          label="Password"
          placeholder="Enter preferred password"
          obscureText={!showPassword}
          value={password}
          onChange={setPassword}
          errorMessage={fieldError}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-text-slate"
            >
              {showPassword ? <IconEye size={18} /> : <IconEyeOff size={18} />}
            </button>
          }
        />
      </div>
      <div className="mt-4 flex items-center">
        <button
          type="button"
          onClick={() => setRememberMe((v) => !v)}
          aria-pressed={rememberMe}
          aria-label="Remember me"
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            rememberMe ? 'bg-primary' : 'bg-surface',
          )}
        >
          <span
            className={cn(
              'absolute h-4 w-4 rounded-full bg-white transition-transform',
              rememberMe ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className="ml-2.5 font-sans text-[13px] text-text-muted">Remember me</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => navigate(ROUTES.FORGOT_PASSWORD.absPath)}
          className="font-sans text-[13px] font-semibold text-primary"
        >
          Forgot password?
        </button>
      </div>
      <div className="mt-6 text-center font-sans text-[13px] text-text-muted">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => navigate(ROUTES.REGISTER.absPath)}
          className="font-semibold text-primary"
        >
          Create account
        </button>
      </div>
    </AuthScreenShell>
  );
}

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppButton, AppOtpInput, AppTextInput } from '@ohlify/ui';

import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { AuthCard } from '../../../shared/parts/auth-card.js';
import { useAdminLogin } from '../api/use-admin-login.js';

const ERROR_COPY: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  totp_invalid: 'That code didn\'t match. Try again.',
  account_locked: 'This admin is locked. Contact a super-admin.',
  account_suspended: 'This admin is suspended.',
  validation_error: 'Check your email and password.',
};

type Stage = 'creds' | 'totp';
const SKIP_TOTP = true;

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const [stage, setStage] = useState<Stage>('creds');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const login = useAdminLogin();

  const submit = (totpCode?: string) => {
    setError(undefined);
    login.mutate(
      { email, password, ...(totpCode ? { totp_code: totpCode } : {}) },
      {
        onSuccess: (data) => {
          if (data.totp_required && !SKIP_TOTP) {
            // Server is asking us to re-send with a code. Switch to the OTP
            // stage instead of treating this as a successful login.
            setStage('totp');
            return;
          }
          navigate(fromPath ?? ADMIN_ROUTES.DASHBOARD.absPath, { replace: true });
        },
        onError: (err) => {
          setError(ERROR_COPY[err.code] ?? err.message);
          // If totp_invalid, stay on the totp stage; otherwise drop back to creds.
          if (err.code !== 'totp_invalid') setStage('creds');
        },
      },
    );
  };

  if (stage === 'totp') {
    return (
      <AuthCard
        title="Two-factor required"
        subtitle="Enter the 6-digit code from your authenticator app."
      >
        <AppOtpInput length={6} autoFocus onChange={setCode} onComplete={(c) => submit(c)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <AppButton
          label="Verify code"
          variant="solid"
          isLoading={login.isPending}
          expanded
          onPressed={code.length === 6 ? () => submit(code) : undefined}
        />
        <button
          type="button"
          className="text-sm font-semibold text-text-muted hover:text-text-primary"
          onClick={() => {
            setStage('creds');
            setCode('');
            setError(undefined);
          }}
        >
          Back
        </button>
      </AuthCard>
    );
  }

  const credsValid = email.length > 0 && password.length > 0;

  return (
    <AuthCard title="Sign in" subtitle="Admin access only.">
      <AppTextInput
        label="Email"
        placeholder="you@ohlify.com"
        inputType="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
      />
      <AppTextInput
        label="Password"
        placeholder="Your password"
        obscureText
        value={password}
        onChange={setPassword}
        errorMessage={error}
      />
      <AppButton
        label="Continue"
        variant="solid"
        isLoading={login.isPending}
        expanded
        onPressed={credsValid ? () => submit() : undefined}
      />
    </AuthCard>
  );
}

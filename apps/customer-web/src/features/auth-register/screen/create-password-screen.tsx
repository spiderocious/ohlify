import { IconCheck, IconEye, IconEyeOff } from '@icons';
import { Repeat } from 'meemaw';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppTextInput } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { AuthScreenShell } from '../../../shared/parts/auth-screen-shell.js';
import { useRegisterSetPassword } from '../api/use-register-set-password.js';
import { useRegisterContext } from '../providers/register-provider.js';

interface PasswordRule {
  label: string;
  test: (s: string) => boolean;
}

const RULES: PasswordRule[] = [
  { label: 'Minimum 8 characters', test: (s) => s.length >= 8 },
  { label: 'Number', test: (s) => /\d/.test(s) },
  { label: 'Special character (e.g., @&$*)', test: (s) => /[!@#$%^&*(),.?":{}|<>@&$*]/.test(s) },
  { label: 'UPPERCASE letter', test: (s) => /[A-Z]/.test(s) },
];

export function CreatePasswordScreen() {
  const navigate = useNavigate();
  const { state } = useRegisterContext();
  const setPassword = useRegisterSetPassword();
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nonFieldError, setNonFieldError] = useState<string | undefined>();

  const rulesMet = RULES.every((r) => r.test(password));
  const passwordsMatch = password !== '' && password === confirm;
  const isValid = rulesMet && passwordsMatch;

  const handleContinue = () => {
    if (!state) return;
    setNonFieldError(undefined);
    setPassword.mutate(
      { registration_token: state.registrationToken, password },
      {
        onSuccess: () => navigate(ROUTES.REGISTER.VERIFY_OTP.absPath),
        onError: (err) => {
          const apiErr = (err as unknown) as ApiError;
          if (apiErr.code === 'token_invalid') {
            setNonFieldError('Registration session expired. Please start again.');
          } else {
            setNonFieldError('Something went wrong. Please try again.');
          }
        },
      },
    );
  };

  return (
    <AuthScreenShell
      title="Create password"
      subtitle="Create a password to secure your account"
      onContinue={isValid && !setPassword.isPending ? handleContinue : undefined}
    >
      <AppTextInput
        label="Password"
        placeholder="Enter preferred password"
        obscureText={!showPassword}
        value={password}
        onChange={setPasswordValue}
        errorMessage={nonFieldError}
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
      <div className="mt-4">
        <AppTextInput
          label="Confirm password"
          placeholder="Enter preferred password"
          obscureText={!showConfirm}
          value={confirm}
          onChange={setConfirm}
          errorMessage={confirm !== '' && !passwordsMatch ? 'Passwords do not match' : undefined}
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="text-text-slate"
            >
              {showConfirm ? <IconEye size={18} /> : <IconEyeOff size={18} />}
            </button>
          }
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-3">
        <Repeat each={RULES}>
          {(rule) => {
            const met = rule.test(password);
            return (
              <div key={rule.label} className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: met ? 'rgba(22,163,74,0.12)' : 'var(--ohl-surface)',
                  }}
                >
                  <IconCheck
                    size={14}
                    color={met ? 'var(--ohl-success)' : 'var(--ohl-text-slate)'}
                  />
                </span>
                <span
                  className="font-sans text-[13px] font-normal"
                  style={{
                    color: met ? 'var(--ohl-text-primary)' : 'var(--ohl-text-slate)',
                  }}
                >
                  {rule.label}
                </span>
              </div>
            );
          }}
        </Repeat>
      </div>
    </AuthScreenShell>
  );
}

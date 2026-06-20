import { IconCheck, IconEye, IconEyeOff } from '@icons';
import { Repeat } from 'meemaw';
import { useState } from 'react';

import { AppButton, AppTextInput, DrawerService } from '@ohlify/ui';
import type { ApiError } from '@ohlify/api';

import { useRequestPasswordOtp, useChangePassword } from '../api/use-change-password.js';

import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

const RULES: Array<{ label: string; test: (s: string) => boolean }> = [
  { label: 'Minimum 8 characters', test: (s) => s.length >= 8 },
  { label: 'Number', test: (s) => /\d/.test(s) },
  { label: 'Special character', test: (s) => /[!@#$%^&*(),.?":{}|<>@&$*]/.test(s) },
  { label: 'UPPERCASE letter', test: (s) => /[A-Z]/.test(s) },
];

const ERROR_MESSAGES: Record<string, string> = {
  invalid_otp: 'The OTP you entered is incorrect.',
  invalid_credentials: 'Your current password is incorrect.',
  otp_expired: 'The OTP has expired. Please request a new one.',
};

/** Mirrors mobile/lib/features/profile/screen/change_password_screen.dart. */
export function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestOtp = useRequestPasswordOtp();
  const changePassword = useChangePassword();

  const rulesMet = RULES.every((r) => r.test(next));
  const matches = next !== '' && next === confirm;
  const isValid = current.length >= 1 && rulesMet && matches;

  const eyeButton = (visible: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle visibility"
      className="text-text-slate"
    >
      {visible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
    </button>
  );

  const handleRequestOtp = () => {
    setError(undefined);
    requestOtp.mutate(undefined, {
      onSuccess: () => setOtpSent(true),
      onError: () => setError('Failed to send OTP. Please try again.'),
    });
  };

  const handleSubmit = () => {
    setError(undefined);
    changePassword.mutate(
      { otp, current_password: current, new_password: next },
      {
        onSuccess: () => {
          DrawerService.showFeedbackModal(
            'Password updated',
            'You will need to sign in again on other devices.',
            { kind: 'success' },
          );
          setCurrent('');
          setNext('');
          setConfirm('');
          setOtp('');
          setOtpSent(false);
        },
        onError: (err) => {
          const e = err as unknown as ApiError;
          setError(ERROR_MESSAGES[e.reason] ?? 'Failed to change password. Please try again.');
        },
      },
    );
  };

  return (
    <ProfileSubscreenScaffold title="Change password">
      <div className="space-y-4">
        <AppTextInput
          label="Current password"
          placeholder="Enter your current password"
          obscureText={!showCurrent}
          value={current}
          onChange={setCurrent}
          endIcon={eyeButton(showCurrent, () => setShowCurrent((v) => !v))}
        />
        <AppTextInput
          label="New password"
          placeholder="Enter a new password"
          obscureText={!showNext}
          value={next}
          onChange={setNext}
          endIcon={eyeButton(showNext, () => setShowNext((v) => !v))}
        />
        <AppTextInput
          label="Confirm password"
          placeholder="Re-enter the new password"
          obscureText={!showConfirm}
          value={confirm}
          onChange={setConfirm}
          errorMessage={confirm !== '' && !matches ? 'Passwords do not match' : undefined}
          endIcon={eyeButton(showConfirm, () => setShowConfirm((v) => !v))}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          <Repeat each={RULES}>
            {(rule) => {
              const met = rule.test(next);
              return (
                <div key={rule.label} className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
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
                    className="font-sans text-[13px]"
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
        {!otpSent ? (
          <AppButton
            label="Continue"
            expanded
            radius={100}
            isDisabled={!isValid}
            isLoading={requestOtp.isPending}
            onPressed={isValid ? handleRequestOtp : undefined}
          />
        ) : (
          <>
            <AppTextInput
              label="OTP"
              placeholder="Enter the 6-digit code we sent"
              maxLength={6}
              value={otp}
              onChange={setOtp}
            />
            {error && (
              <p className="font-sans text-sm" style={{ color: 'var(--ohl-danger)' }}>
                {error}
              </p>
            )}
            <AppButton
              label="Save changes"
              expanded
              radius={100}
              isDisabled={otp.length < 6}
              isLoading={changePassword.isPending}
              onPressed={otp.length >= 6 ? handleSubmit : undefined}
            />
          </>
        )}
      </div>
    </ProfileSubscreenScaffold>
  );
}

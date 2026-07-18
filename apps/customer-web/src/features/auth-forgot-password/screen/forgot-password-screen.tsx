import { IconBack } from '@icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppIconButton, AppText, AppTextInput, ScreenContinueBar } from '@ohlify/ui';

import { useFpInitiate } from '../api/use-fp-initiate.js';
import { useForgotPasswordContext } from '../providers/forgot-password-provider.js';

const EMAIL_RE = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const { setEmail } = useForgotPasswordContext();
  const initiate = useFpInitiate();
  const [email, setEmailValue] = useState('');
  const emailValid = EMAIL_RE.test(email);

  const handleContinue = () => {
    initiate.mutate(
      { email },
      {
        onSuccess: () => {
          setEmail(email);
          navigate(ROUTES.FORGOT_PASSWORD.VERIFY_OTP.absPath);
        },
        onError: (_err) => {
          // Always navigate (API returns 200 always to prevent enumeration)
          setEmail(email);
          navigate(ROUTES.FORGOT_PASSWORD.VERIFY_OTP.absPath);
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-4 lg:max-w-2xl">
          <div className="flex items-center">
            <AppIconButton
              icon={<IconBack color="var(--ohl-text-primary)" size={18} />}
              variant="outline"
              size={40}
              onPressed={() => navigate(-1)}
              ariaLabel="Back"
            />
            <div className="flex-1 text-center">
              <AppText
                variant="bodyTitle"
                color="var(--ohl-text-muted)"
                weight={600}
                align="center"
              >
                Forgot Password
              </AppText>
            </div>
            <span className="w-10" />
          </div>

          <div className="mt-8">
            <AppText as="h1" variant="bodyTitle" weight={700} align="start">
              Provide the credentials below to get started.
            </AppText>
          </div>

          <div className="mt-7">
            <AppTextInput
              label="Email"
              placeholder="Ex. you@example.com"
              inputType="email"
              inputMode="email"
              value={email}
              onChange={setEmailValue}
              errorMessage={
                email !== '' && !emailValid ? 'Please enter a valid email address.' : undefined
              }
            />
          </div>
        </div>
      </div>

      <ScreenContinueBar
        onPressed={emailValid && !initiate.isPending ? handleContinue : undefined}
      />
    </div>
  );
}

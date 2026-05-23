import { IconBack } from '@icons';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppIconButton, AppText, ScreenContinueBar } from '@ohlify/ui';

interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  /** "Continue" by default. Login uses "Login". */
  ctaLabel?: string;
  /** Pressing the bottom CTA. `undefined` disables it. */
  onContinue?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * Mirrors the mobile auth scaffold (Register, CreatePassword, VerifyOtp,
 * Login, ForgotPassword, ResetPassword): top back button, logo, title,
 * subtitle, scrollable body, sticky bottom continue bar.
 */
export function AuthScreenShell({
  title,
  subtitle,
  ctaLabel = 'Continue',
  onContinue,
  children,
}: AuthScreenShellProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-4 lg:max-w-2xl">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-primary)" size={18} />}
            variant="outline"
            size={40}
            onPressed={() => navigate(-1)}
            ariaLabel="Back"
          />

          <div className="mt-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
              <span className="text-base font-extrabold">o</span>
            </div>
          </div>

          <AppText as="h1" variant="bodyTitle" weight={700} align="start" className="mt-5">
            {title}
          </AppText>
          <AppText
            as="p"
            variant="body"
            color="var(--ohl-text-muted)"
            align="start"
            className="mt-2"
          >
            {subtitle}
          </AppText>

          <div className="mt-7">{children}</div>

          {/*
            Desktop (lg+): the CTA sits directly under the form, constrained to the
            form column width, with a rounded edge — not a full-bleed sticky bar.
            Mobile keeps the edge-to-edge sticky bottom bar (rendered below).
          */}
          <div className="mt-8 hidden overflow-hidden rounded-xl lg:block">
            <ScreenContinueBar label={ctaLabel} onPressed={onContinue} />
          </div>
        </div>
      </div>

      {/* Mobile (< lg): sticky full-width bottom bar — unchanged behavior. */}
      <div className="lg:hidden">
        <ScreenContinueBar label={ctaLabel} onPressed={onContinue} />
      </div>
    </div>
  );
}

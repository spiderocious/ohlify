import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppButton, AppOtpInput, AppText, AppTextInput } from '@ohlify/ui';
import type { AdminTotpSetupResponse } from '@ohlify/api';

import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { AuthCard } from '../../../shared/parts/auth-card.js';
import { useAdminTotpConfirm, useAdminTotpSetup } from '../api/use-admin-totp.js';

type Stage = 'password' | 'qr';

/**
 * Two-stage onboarding flow for enabling TOTP on the current admin account:
 *   1. Re-enter password → server returns secret + provisioning URL.
 *   2. Scan QR in authenticator → enter 6-digit code to confirm.
 *
 * Successful confirm flips the cached admin user's `totp_enabled` flag and
 * sends them onward to the dashboard.
 */
export function TotpSetupScreen() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('password');
  const [password, setPassword] = useState('');
  const [setupData, setSetupData] = useState<AdminTotpSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const setup = useAdminTotpSetup();
  const confirm = useAdminTotpConfirm();

  const handleSetup = () => {
    setError(undefined);
    setup.mutate(
      { password },
      {
        onSuccess: (data) => {
          setSetupData(data);
          setStage('qr');
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleConfirm = (override?: string) => {
    setError(undefined);
    confirm.mutate(
      { code: override ?? code },
      {
        onSuccess: () => navigate(ADMIN_ROUTES.DASHBOARD.absPath, { replace: true }),
        onError: (err) => setError(err.message),
      },
    );
  };

  if (stage === 'qr' && setupData) {
    return (
      <AuthCard title="Scan this QR code" subtitle="Use Google Authenticator, 1Password, or similar.">
        <img
          src={setupData.qr_code_data_url}
          alt="TOTP QR"
          className="mx-auto h-48 w-48 rounded-md border border-border"
        />
        <AppText variant="bodySmall" className="text-center text-text-muted">
          Or enter manually:{' '}
          <code className="rounded bg-surface-light px-1.5 py-0.5 text-xs">{setupData.secret}</code>
        </AppText>

        <AppOtpInput
          length={6}
          autoFocus
          onChange={setCode}
          onComplete={(c) => handleConfirm(c)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <AppButton
          label="Confirm code"
          variant="solid"
          isLoading={confirm.isPending}
          expanded
          onPressed={code.length === 6 ? () => handleConfirm() : undefined}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Enable two-factor" subtitle="Confirm your password to generate a new TOTP secret.">
      <AppTextInput
        label="Password"
        placeholder="Your current password"
        obscureText
        value={password}
        onChange={setPassword}
        errorMessage={error}
      />
      <AppButton
        label="Continue"
        variant="solid"
        isLoading={setup.isPending}
        expanded
        onPressed={password.length > 0 ? handleSetup : undefined}
      />
    </AuthCard>
  );
}

import { IconBack } from '@icons';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppIconButton, AppText } from '@ohlify/ui';

interface ProfileSubscreenScaffoldProps {
  title: string;
  children: ReactNode;
  /** Optional sticky bottom CTA. */
  footer?: ReactNode;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_subscreen_scaffold.dart. */
export function ProfileSubscreenScaffold({
  title,
  children,
  footer,
}: ProfileSubscreenScaffoldProps) {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-6 pt-2 lg:max-w-5xl">
        <div className="flex items-center gap-3 py-2">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
            variant="ghost"
            backgroundColor="var(--ohl-background)"
            size={44}
            onPressed={() => navigate(-1)}
            ariaLabel="Back"
          />
          <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
            {title}
          </AppText>
        </div>
        <div className="mt-2">{children}</div>
      </div>
      {footer ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2 lg:max-w-5xl">{footer}</div>
      ) : null}
    </main>
  );
}

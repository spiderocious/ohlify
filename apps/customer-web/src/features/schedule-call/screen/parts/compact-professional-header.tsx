import { IconBack, IconStar, IconUser } from '@icons';

import { useFilePreview } from '@ohlify/api';
import { AppIconButton, AppText } from '@ohlify/ui';

interface CompactProfessionalHeaderProps {
  name: string | null;
  role: string | null;
  rating: number;
  imageKey: string | null;
  onBack: () => void;
}

/**
 * Compact ~64-tall strip used on the schedule-call screen. Replaces the
 * cover-photo `ProfessionalHeader` so the form is above the fold.
 */
export function CompactProfessionalHeader({
  name,
  role,
  rating,
  imageKey,
  onBack,
}: CompactProfessionalHeaderProps) {
  const { uri } = useFilePreview(imageKey ?? undefined);
  return (
    <div className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 lg:max-w-5xl">
        <AppIconButton
          icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
          variant="ghost"
          backgroundColor="var(--ohl-surface-light)"
          size={40}
          onPressed={onBack}
          ariaLabel="Back"
        />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
          {uri ? (
            <img src={uri} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconUser size={20} color="var(--ohl-text-muted)" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <AppText variant="body" weight={700} align="start" color="var(--ohl-text-jet)" maxLines={1}>
            {name ?? 'Professional'}
          </AppText>
          <AppText
            variant="bodyNormal"
            weight={500}
            align="start"
            color="var(--ohl-text-muted)"
            maxLines={1}
            className="mt-0.5"
          >
            {role ?? ''}
          </AppText>
        </div>
        <span className="inline-flex items-center gap-1 rounded-pill bg-surface-light px-2.5 py-1.5">
          <IconStar size={12} color="var(--ohl-text-jet)" />
          <span className="font-sans text-xs font-semibold text-text-jet">
            {rating.toFixed(1)}
          </span>
        </span>
      </div>
    </div>
  );
}

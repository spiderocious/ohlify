import { IconChevronRight, type LucideIcon } from '@icons';

import { AppText } from '@ohlify/ui';

interface PersonalInfoRowProps {
  Icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle: string;
  onTap: () => void;
}

/** Mirrors mobile/lib/features/profile/screen/parts/personal_info_row.dart. */
export function PersonalInfoRow({
  Icon,
  iconColor = 'var(--ohl-text-muted)',
  title,
  subtitle,
  onTap,
}: PersonalInfoRowProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-2xl bg-background p-3.5 text-left"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-dark"
        style={{ color: iconColor }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
          {title}
        </AppText>
        <AppText
          variant="bodyNormal"
          align="start"
          color="var(--ohl-text-muted)"
          maxLines={1}
          className="mt-0.5"
        >
          {subtitle}
        </AppText>
      </div>
      <IconChevronRight size={16} color="var(--ohl-text-slate)" />
    </button>
  );
}

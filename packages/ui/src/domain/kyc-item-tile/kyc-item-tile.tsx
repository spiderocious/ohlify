import { IconCheck, IconChevronRight, IconClock, type LucideIcon } from '@icons';

import { cn } from '../../utils/cn.js';

interface KycItemTileProps {
  Icon: LucideIcon;
  title: string;
  /** Filled value (when complete) or hint sentence (when not). */
  subtitle: string;
  completed: boolean;
  onTap: () => void;
  className?: string;
}

/** Mirrors mobile KycItemTile. */
export function KycItemTile({
  Icon,
  title,
  subtitle,
  completed,
  onTap,
  className,
}: KycItemTileProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-md bg-background p-4 text-left font-sans',
        className,
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-dark">
        <Icon size={20} color="var(--ohl-primary)" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-jet">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-text-muted">{subtitle}</p>
      </div>
      <Status completed={completed} />
      <IconChevronRight size={20} color="var(--ohl-text-slate)" />
    </button>
  );
}

function Status({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-success">
        <IconCheck size={16} color="#fff" />
      </div>
    );
  }
  return (
    <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface-light">
      <IconClock size={14} color="var(--ohl-text-muted)" />
    </div>
  );
}

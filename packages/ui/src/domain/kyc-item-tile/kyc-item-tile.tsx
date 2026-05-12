import { IconCheck, IconChevronRight, IconClock, IconLock, type LucideIcon } from '@icons';

import { cn } from '../../utils/cn.js';

interface KycItemTileProps {
  Icon: LucideIcon;
  title: string;
  /** Filled value (when complete) or hint sentence (when not). */
  subtitle: string;
  completed: boolean;
  onTap: () => void;
  /**
   * Locked state — used during partial-rejection resubmits where the user
   * may only re-edit the items the admin flagged. Locked tiles render
   * dimmed, ignore taps, and show a lock indicator instead of the
   * complete/incomplete pill. The backend also enforces this on PATCH.
   */
  locked?: boolean;
  className?: string;
}

/** Mirrors mobile KycItemTile. */
export function KycItemTile({
  Icon,
  title,
  subtitle,
  completed,
  onTap,
  locked = false,
  className,
}: KycItemTileProps) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onTap}
      aria-disabled={locked}
      disabled={locked}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-md bg-background p-4 text-left font-sans transition-opacity',
        locked && 'cursor-not-allowed opacity-60',
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
      <Status completed={completed} locked={locked} />
      {!locked && <IconChevronRight size={20} color="var(--ohl-text-slate)" />}
    </button>
  );
}

function Status({ completed, locked }: { completed: boolean; locked: boolean }) {
  if (locked) {
    return (
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface-light">
        <IconLock size={13} color="var(--ohl-text-muted)" />
      </div>
    );
  }
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

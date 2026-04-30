import { cn } from '../../utils/cn.js';

interface KycProgressHeaderProps {
  completed: number;
  total: number;
  /** 0–100. */
  percent: number;
  title?: string;
  className?: string;
}

/** Mirrors mobile KycProgressHeader. */
export function KycProgressHeader({
  completed,
  total,
  percent,
  title = 'Complete your profile',
  className,
}: KycProgressHeaderProps) {
  const ratio = total === 0 ? 0 : (completed / total) * 100;
  return (
    <div className={cn('w-full rounded-[20px] bg-background p-[18px] font-sans', className)}>
      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-lg font-bold text-text-jet">{title}</p>
          <p className="mt-1 text-sm text-text-muted">
            {completed} of {total} steps done
          </p>
        </div>
        <p className="text-[22px] font-bold text-primary">{percent}%</p>
      </div>
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-pill bg-surface-light">
        <div
          className="h-full rounded-pill bg-primary transition-all duration-300 ease-out"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

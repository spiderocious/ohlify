import { cn } from '../../utils/cn.js';

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  className?: string;
}

/** "Heading + View all" row above lists/grids. Mirrors mobile SectionHeader. */
export function SectionHeader({
  title,
  onViewAll,
  viewAllLabel = 'View all',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <span className="font-sans text-base font-medium text-text-muted">{title}</span>
      <span className="flex-1" />
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="font-sans text-base font-bold text-text-primary"
        >
          {viewAllLabel}
        </button>
      ) : null}
    </div>
  );
}

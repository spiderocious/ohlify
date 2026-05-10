import { Link } from 'react-router-dom';

import { cn } from '@ohlify/ui';
import { IconChevronLeft } from '@icons';

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

/** Small back-arrow link used at the top of every detail screen. */
export function BackLink({ to, label, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text-primary',
        className,
      )}
    >
      <IconChevronLeft size={16} />
      <span>{label}</span>
    </Link>
  );
}

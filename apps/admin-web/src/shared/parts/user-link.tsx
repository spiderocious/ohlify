import { Link } from 'react-router-dom';

import { cn } from '@ohlify/ui';

import { ADMIN_ROUTES } from '../routes/admin-routes.js';
import { shortId } from '../lib/labels.js';

interface UserLinkProps {
  userId: string | null | undefined;
  /** Override the displayed text. Defaults to a shortened id. */
  label?: string | null;
  /** Length passed to shortId() when no label is given. */
  idLen?: number;
  className?: string;
  /** Mono / code styling — sensible default for raw ids in tables. */
  mono?: boolean;
}

/**
 * Clickable reference to a user. Renders the supplied label (or short id)
 * as a `<Link>` to /users/:id. Falls back to "—" when no id is present —
 * never renders a dead link.
 */
export function UserLink({
  userId,
  label,
  idLen = 14,
  className,
  mono = true,
}: UserLinkProps) {
  if (!userId) return <span className="text-text-muted">—</span>;
  const display = label ?? shortId(userId, idLen);
  return (
    <Link
      to={ADMIN_ROUTES.USERS.DETAIL.build({ id: userId })}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'text-primary hover:underline',
        mono && !label ? 'font-mono text-xs' : '',
        className,
      )}
    >
      {display}
    </Link>
  );
}

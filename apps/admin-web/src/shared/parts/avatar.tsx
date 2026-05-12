import { useFilePreview } from '@ohlify/api';
import { cn } from '@ohlify/ui';

interface AvatarProps {
  /** File-service key, NOT a URL. */
  fileKey?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * Resolves a file-service key to a presigned image URL and renders it as a
 * round avatar. Falls back to a colored initials bubble when no key (or
 * the key fails to resolve). Sized via `size` (default 32).
 */
export function Avatar({ fileKey, name, size = 32, className }: AvatarProps) {
  const { uri } = useFilePreview(fileKey);
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('') || '?';

  // Stable color per name so two avatars for the same user always match.
  const hue = (name ?? 'x').split('').reduce((acc, c) => (acc + c.charCodeAt(0)) % 360, 0);
  const bg = `hsl(${hue} 60% 88%)`;
  const fg = `hsl(${hue} 60% 28%)`;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        backgroundColor: uri ? 'transparent' : bg,
        color: fg,
      }}
      aria-label={name ?? 'avatar'}
    >
      {uri ? (
        <img
          src={uri}
          alt={name ?? 'avatar'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </span>
  );
}

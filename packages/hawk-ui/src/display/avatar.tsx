import { useState, type ReactNode } from 'react';

import { HAWK_AVATAR_PX, type HawkAvatarSize } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeleton } from '../foundation/skeleton.js';
import { IconVerified } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HawkPresenceIndicator, type HawkPresence } from '../status/badge.js';

export interface HawkAvatarProps {
  name: string;
  src?: string;
  size?: HawkAvatarSize;
  /** Presence dot on the lower-right. */
  presence?: HawkPresence;
  /** The verified tick — a KYC-verified professional. */
  verified?: boolean;
  /** Square with the register's radius, rather than a circle. */
  square?: boolean;
  className?: string;
}

const FONT: Record<HawkAvatarSize, string> = {
  xs: 'text-hawk-tiny',
  sm: 'text-hawk-caption',
  md: 'text-hawk-label',
  lg: 'text-hawk-subheader',
  xl: 'text-hawk-title',
};

/**
 * Initials from a name.
 *
 * First and last, so "Adaeze Chidinma Okonkwo" reads AO rather than AC — the
 * surname carries more identifying weight than a middle name in a list of
 * people.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * A stable tint per person.
 *
 * Hashed from the name, so the same person keeps the same colour across every
 * screen and across sessions. Random-per-render would make a list flicker into
 * a different palette on every refresh.
 */
const TINTS = [
  'bg-hawk-v-100 text-hawk-v-700',
  'bg-hawk-g-50 text-hawk-g-700',
  'bg-hawk-b-50 text-hawk-b-700',
  'bg-hawk-a-50 text-hawk-a-700',
  'bg-hawk-n-100 text-hawk-n-700',
] as const;

function tintOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

export function HawkAvatar({
  name,
  src,
  size = 'md',
  presence,
  verified = false,
  square = false,
  className,
}: HawkAvatarProps) {
  // A broken image URL falls back to initials rather than rendering the
  // browser's own broken-image glyph, which looks like a bug to the user.
  const [failed, setFailed] = useState(false);
  const px = HAWK_AVATAR_PX[size];
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', square ? 'rounded-hawk-sm' : 'rounded-full')}
        />
      ) : (
        <span
          aria-label={name}
          role="img"
          className={cn(
            'flex h-full w-full items-center justify-center font-bold',
            square ? 'rounded-hawk-sm' : 'rounded-full',
            FONT[size],
            tintOf(name),
          )}
        >
          {initialsOf(name)}
        </span>
      )}

      {presence && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-hawk-paper p-0.5">
          <HawkPresenceIndicator presence={presence} size={Math.max(6, px * 0.2)} />
        </span>
      )}

      {verified && !presence && (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-hawk-paper">
          <HawkIcon
            icon={IconVerified}
            size={Math.max(12, px * 0.32)}
            label="Verified"
            className="fill-hawk-acc text-hawk-acc-on"
          />
        </span>
      )}
    </span>
  );
}

/** Overlapping avatars — a group, a call's participants. */
export function HawkAvatarStack({
  people,
  size = 'sm',
  max = 4,
  className,
}: {
  people: ReadonlyArray<{ name: string; src?: string }>;
  size?: HawkAvatarSize;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  const px = HAWK_AVATAR_PX[size];

  return (
    <span className={cn('inline-flex items-center', className)}>
      {shown.map((person, index) => (
        <span
          key={`${person.name}-${index}`}
          className="rounded-full ring-2 ring-hawk-paper"
          style={{ marginLeft: index === 0 ? 0 : -px * 0.3 }}
        >
          <HawkAvatar name={person.name} src={person.src} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'hawk-record inline-flex items-center justify-center rounded-full',
            'bg-hawk-sunken font-bold tabular-nums text-hawk-ink-muted ring-2 ring-hawk-paper',
            FONT[size],
          )}
          style={{ width: px, height: px, marginLeft: -px * 0.3 }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

export function HawkAvatarSkeleton({ size = 'md' }: { size?: HawkAvatarSize }) {
  const px = HAWK_AVATAR_PX[size];
  return <HawkSkeleton circle width={px} height={px} />;
}

/** Avatar plus name and subtitle — the identity block used across rows. */
export function HawkIdentity({
  name,
  subtitle,
  src,
  size = 'md',
  presence,
  verified,
  trailing,
  className,
}: {
  name: string;
  subtitle?: ReactNode;
  src?: string;
  size?: HawkAvatarSize;
  presence?: HawkPresence;
  verified?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-hawk-4', className)}>
      <HawkAvatar
        name={name}
        src={src}
        size={size}
        {...(presence ? { presence } : {})}
        {...(verified ? { verified } : {})}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-hawk-body font-medium text-hawk-ink-strong">{name}</span>
        {subtitle && (
          <span className="truncate text-hawk-caption text-hawk-ink-muted">{subtitle}</span>
        )}
      </div>
      {trailing}
    </div>
  );
}

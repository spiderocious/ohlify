import { IconUser } from '@icons';

import { cn } from '@ohlify/ui';

interface UpcomingCallBannerProps {
  calleeName: string;
  /** Human-readable countdown, e.g. "5 mins". */
  scheduledTime: string;
  onJoin: () => void;
  className?: string;
}

/**
 * Mirrors mobile/lib/features/home/screen/parts/upcoming_call_banner.dart.
 * Primary-tinted card with a circular avatar, countdown copy, and Join CTA.
 */
export function UpcomingCallBanner({
  calleeName,
  scheduledTime,
  onJoin,
  className,
}: UpcomingCallBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-primary p-3 pl-4 text-white',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
        <IconUser size={22} color="#fff" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold">Upcoming call · {calleeName}</p>
        <p className="truncate font-sans text-xs text-white/80">Starts in {scheduledTime}</p>
      </div>
      <button
        type="button"
        onClick={onJoin}
        className="shrink-0 rounded-pill bg-white px-4 py-2 font-sans text-sm font-semibold text-primary"
      >
        Join
      </button>
    </div>
  );
}

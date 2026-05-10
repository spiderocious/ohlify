import { IconUser } from '@icons';
import { Show } from 'meemaw';

import { useFilePreview } from '@ohlify/api';
import { cn } from '@ohlify/ui';

interface CallBlurredBackdropProps {
  /** File-service key for the peer's avatar (NOT a URL). */
  fileKey?: string | null;
  className?: string;
}

/** Mirrors mobile call_blurred_backdrop — blurred peer-photo with a dark overlay. */
export function CallBlurredBackdrop({ fileKey, className }: CallBlurredBackdropProps) {
  const { uri } = useFilePreview(fileKey);
  return (
    <div
      className={cn('absolute inset-0 overflow-hidden bg-black', className)}
      aria-hidden="true"
    >
      <Show
        when={Boolean(uri)}
        fallback={
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <IconUser size={120} />
          </div>
        }
      >
        <img
          src={uri}
          alt=""
          className="h-full w-full scale-110 object-cover opacity-60 blur-2xl"
        />
      </Show>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />
    </div>
  );
}

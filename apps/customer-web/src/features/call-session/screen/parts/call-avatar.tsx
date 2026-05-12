import { AppAvatar } from '@ohlify/ui';

interface CallAvatarProps {
  /** File-service key for the peer's avatar (NOT a URL). */
  fileKey?: string | null;
  size?: number;
}

/** Mirrors mobile call_avatar — circular peer image with placeholder. */
export function CallAvatar({ fileKey, size = 120 }: CallAvatarProps) {
  return (
    <AppAvatar
      fileKey={fileKey}
      size={size}
      className="bg-white/10 backdrop-blur-sm"
    />
  );
}

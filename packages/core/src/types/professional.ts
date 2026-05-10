export interface Professional {
  id: string;
  name: string;
  /** Occupation/role label, e.g. "Senior sales manager". */
  role: string;
  rating: number;
  reviewCount: number;
  /**
   * File-service key for the avatar (e.g. `8204e793-….jpg`), NOT a URL.
   * Render via `<AppAvatar fileKey={...}>` from `@ohlify/ui`.
   */
  avatarKey?: string | null;
  /** Starting price in NGN whole naira. Used for sort. */
  basePrice?: number;
}

export interface ProfessionalCategory {
  label: string;
  value: string;
}

export interface UpcomingCall {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  /** File-service key. See `Professional.avatarKey`. */
  avatarKey?: string | null;
}

export interface ScheduledCall {
  id: string;
  calleeName: string;
  /** Human-readable countdown, e.g. "5 mins". */
  scheduledTime: string;
  /** File-service key. See `Professional.avatarKey`. */
  avatarKey?: string | null;
}

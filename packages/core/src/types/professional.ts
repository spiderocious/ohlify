export interface Professional {
  id: string;
  name: string;
  /** Occupation/role label, e.g. "Senior sales manager". */
  role: string;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
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
  avatarUrl?: string;
}

export interface ScheduledCall {
  id: string;
  calleeName: string;
  /** Human-readable countdown, e.g. "5 mins". */
  scheduledTime: string;
  avatarUrl?: string;
}

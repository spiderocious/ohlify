/** Mirrors mobile/lib/shared/types/professional.dart. */
export interface Professional {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  /** Starting price in NGN (whole naira). Used for sorting in search. */
  basePrice?: number;
}

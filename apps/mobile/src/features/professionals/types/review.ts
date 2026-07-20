/** Mirrors mobile/lib/shared/types/review.dart. */
export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  timeAgo: string;
  authorAvatarUrl?: string;
}
